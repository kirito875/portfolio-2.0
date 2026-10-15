import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

export async function GET(){
 const filePath = path.join(process.cwd(),"secure_files","SaikireetiResume2024.pdf");

 if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=resume.pdf`,
  });

  return new Response(fileBuffer, { headers });

}