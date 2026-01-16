import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

console.log("🤖 Bot starting...");
console.log("Environment check:");
console.log("- DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "✓" : "✗");
console.log("- SUPABASE_URL:", process.env.SUPABASE_URL ? "✓" : "✗");
console.log("- SUPABASE_SERVICE_KEY:", process.env.SUPABASE_SERVICE_KEY ? "✓" : "✗");
console.log("- GROQ_API_KEY:", process.env.GROQ_API_KEY ? "✓" : "✗");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

client.on("clientReady", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.on("error", error => {
  console.error("❌ Discord client error:", error);
});

process.on("unhandledRejection", error => {
  console.error("❌ Unhandled promise rejection:", error);
});

client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  console.log(`📨 Message from ${msg.author.tag}: "${msg.content}"`);

  try {
    const { data: allow, error: allowError } = await supabase.from("allowlist").select("channel_id");
    
    if (allowError) {
      console.error("❌ Error fetching allowlist:", allowError);
      return;
    }

    if (!allow) {
      console.log("⚠️  No allowlist data");
      return;
    }

    const allowedChannels = allow.map(a => a.channel_id);
    
    if (!allowedChannels.includes(msg.channelId)) {
      console.log(`⛔ Channel not in allowlist (${msg.channelId})`);
      return;
    }

    console.log("✅ Channel is in allowlist");

    // Fetch system instructions
    const { data: instrData, error: instrError } = await supabase.from("instructions").select().single();
    if (instrError) console.error("❌ Error fetching instructions:", instrError);

    // Fetch memory
    const { data: memData, error: memError } = await supabase.from("memory").select().single();
    if (memError) console.error("❌ Error fetching memory:", memError);

    // Fetch knowledge base files for RAG context
    let ragContext = "";
    try {
      const { data: files, error: filesError } = await supabase.from("knowledge_files").select("*").limit(3);
      if (filesError) {
        console.log("⚠️  No knowledge files table yet");
      } else if (files && files.length > 0) {
        console.log(`📚 Found ${files.length} knowledge files`);
        
        // Try to fetch actual content from storage
        let fileContents = [];
        for (const file of files) {
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from("knowledge-base")
              .download(file.storage_path);
            
            if (!downloadError && fileData) {
              const buffer = await fileData.arrayBuffer();
              const text = Buffer.from(buffer).toString('utf-8').substring(0, 1000);
              fileContents.push(`File: ${file.name}\n${text}`);
              console.log(`✅ Loaded content from ${file.name}`);
            }
          } catch (e) {
            console.log(`⚠️  Could not extract content from ${file.name}`);
            fileContents.push(`File: ${file.name} (${file.size} bytes)`);
          }
        }
        
        ragContext = `\n\nKnowledge Base:\n${fileContents.join("\n---\n")}`;
      }
    } catch (e) {
      console.log("⚠️  RAG system error:", e.message);
    }

    const systemPrompt = `${instrData?.content || "You are a helpful Discord bot assistant."}${ragContext}`;
    const memory = memData?.summary || "";

    console.log("💭 Building prompt...");
    const conversationContext = memory ? `Previous conversation:\n${memory}\n\n` : "";
    const userMessage = `User: ${msg.content}`;
    
    const fullPrompt = `${conversationContext}${userMessage}`;

    console.log("🔄 Calling Groq API...");
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      max_tokens: 500,
      temperature: 0.7,
    });

    const botResponse = response.choices[0].message.content;
    console.log(`✅ Got response: "${botResponse.substring(0, 50)}..."`);

    // Send response
    if (botResponse.length > 2000) {
      const chunks = botResponse.match(/[\s\S]{1,1990}/g) || [];
      for (const chunk of chunks) {
        await msg.reply(chunk);
      }
    } else {
      await msg.reply(botResponse);
    }

    // Update memory
    const newMemory = `${memory}\nUser: ${msg.content}\nBot: ${botResponse}`;
    await supabase.from("memory").update({ summary: newMemory }).eq("id", memData?.id);
    console.log("💾 Memory updated");

  } catch (error) {
    console.error("❌ Error processing message:", error);
    msg.reply("❌ An error occurred processing your message.").catch(e => console.error("Error sending error message:", e));
  }
});

client.login(process.env.DISCORD_TOKEN);
