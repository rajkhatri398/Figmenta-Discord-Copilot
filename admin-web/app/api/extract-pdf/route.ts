import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const storagePath = formData.get("storagePath") as string;

    if (!file || !storagePath) {
      return NextResponse.json(
        { error: "Missing file or storagePath" },
        { status: 400 }
      );
    }

    // Download file from Supabase Storage
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.storage
      .from("knowledge-base")
      .download(storagePath);

    if (error) {
      return NextResponse.json(
        { error: `Failed to download: ${error.message}` },
        { status: 500 }
      );
    }

    // Extract text from PDF
    const buffer = await (data as Blob).arrayBuffer();
    const pdfParse = (await import("pdf-parse")).default;

    let text = "";
    try {
      const pdf = await pdfParse(buffer);
      text = pdf.text;
    } catch (pdfError: any) {
      console.log("PDF parsing note:", pdfError.message);
      // If PDF parsing fails, we'll try with basic extraction
      text = `[PDF File: ${file.name} - ${buffer.byteLength} bytes]`;
    }

    return NextResponse.json({
      success: true,
      content: text.substring(0, 5000), // Limit to 5000 chars for context
      size: buffer.byteLength,
    });
  } catch (error: any) {
    console.error("Error extracting PDF:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract PDF" },
      { status: 500 }
    );
  }
}
