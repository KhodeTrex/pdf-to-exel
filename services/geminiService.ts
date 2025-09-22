import { GoogleGenAI, Type } from "@google/genai";
import type { TableData } from '../types';

const schema = {
  type: Type.OBJECT,
  properties: {
    headers: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "The column headers of the table.",
    },
    rows: {
      type: Type.ARRAY,
      items: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "A single row of the table."
      },
      description: "The rows of the table, where each row is an array of strings.",
    },
  },
  required: ["headers", "rows"],
};

export async function convertPdfTextToTableData(pdfText: string): Promise<TableData> {
  const apiKey = (typeof process !== 'undefined' && process.env.API_KEY) ? process.env.API_KEY : null;

  if (!apiKey) {
    console.warn("API_KEY environment variable is not set. Returning mock data for demonstration purposes.");
    // Simulate network delay to mimic processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      headers: ["شرح کالا", "تعداد", "قیمت واحد (ریال)", "مبلغ کل (ریال)"],
      rows: [
        ["مانیتور ۲۴ اینچ", "۲", "۵۰,۰۰۰,۰۰۰", "۱۰۰,۰۰۰,۰۰۰"],
        ["کیبورد مکانیکی", "۵", "۸,۵۰۰,۰۰۰", "۴۲,۵۰۰,۰۰۰"],
        ["ماوس بی‌سیم", "۱۰", "۳,۰۰۰,۰۰۰", "۳۰,۰۰۰,۰۰۰"],
        ["هارد اکسترنال ۱ ترابایت", "۳", "۴,۲۰۰,۰۰۰", "۱۲,۶۰۰,۰۰۰"]
      ],
      isMock: true,
    };
  }
  
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  const prompt = `You are an expert data extraction tool. Your task is to analyze the text provided below, which has been extracted from a PDF document. Identify the primary table or structured data within this text. Convert this data into a structured JSON object.

The JSON object must contain two keys:
1.  'headers': An array of strings representing the column titles.
2.  'rows': An array of arrays, where each inner array represents a single row of data as strings.

Important Rules:
- Ensure the number of elements in each row array exactly matches the number of elements in the headers array.
- If there are multiple tables, focus on the most prominent and complete one.
- If the text does not appear to contain a table, do your best to structure the information logically into headers and rows.
- Do not invent data. Only use information present in the provided text.

Here is the text from the PDF:
---
${pdfText}
---
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonString = response.text;
    const parsedData = JSON.parse(jsonString);

    // Basic validation to ensure the structure matches TableData
    if (
      !parsedData ||
      !Array.isArray(parsedData.headers) ||
      !Array.isArray(parsedData.rows)
    ) {
      throw new Error("Invalid data structure returned from AI.");
    }
    
    // Ensure all rows have the same number of columns as headers
    const headerCount = parsedData.headers.length;
    const isValid = parsedData.rows.every((row: any) => Array.isArray(row) && row.length === headerCount);

    if (!isValid) {
        console.warn("AI returned rows with inconsistent column counts. The data might be misaligned.");
        // We can still return it and let the user decide, or throw an error.
        // For robustness, let's proceed.
    }


    return { ...parsedData, isMock: false } as TableData;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.message.includes("API key not valid")) {
        throw new Error("کلید API ارائه شده نامعتبر است. لطفاً پیکربندی برنامه را بررسی کنید.");
    }
    throw new Error("پردازش توسط هوش مصنوعی با خطا مواجه شد. ممکن است PDF شما جدول واضحی نداشته باشد یا مشکل شبکه‌ای وجود داشته باشد.");
  }
}