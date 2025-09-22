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

// Access the globally available API_KEY, assuming it's set by the environment
const API_KEY = (window as any).process?.env?.API_KEY;

export async function convertPdfTextToTableData(pdfText: string): Promise<TableData> {
  if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY") {
    throw new Error("کلید API تنظیم نشده است. لطفاً فایل index.html را ویرایش کرده و کلید Gemini API معتبر خود را در آن قرار دهید.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
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

    if (!jsonString) {
        throw new Error("هوش مصنوعی پاسخ معتبری برنگرداند. ممکن است محتوای PDF برای استخراج جدول مناسب نباشد.");
    }

    let parsedData: TableData;
    try {
        parsedData = JSON.parse(jsonString);
    } catch (parseError) {
        console.error("Failed to parse AI response as JSON. Response text:", jsonString);
        throw new Error("هوش مصنوعی پاسخی با فرمت نامعتبر ارسال کرد. لطفاً دوباره تلاش کنید یا فایل دیگری را امتحان کنید.");
    }

    // Basic validation to ensure the structure matches TableData
    if (
      !parsedData ||
      !Array.isArray(parsedData.headers) ||
      !Array.isArray(parsedData.rows)
    ) {
      throw new Error("ساختار داده‌های دریافت شده از هوش مصنوعی نامعتبر است. پاسخ فاقد 'headers' یا 'rows' بود.");
    }
    
    // Ensure all rows have the same number of columns as headers
    const headerCount = parsedData.headers.length;
    const areRowsValid = parsedData.rows.every((row: any) => Array.isArray(row) && row.length === headerCount);

    if (headerCount > 0 && !areRowsValid) {
        console.warn("AI returned rows with inconsistent column counts.", { headerCount, rows: parsedData.rows });
        throw new Error("هوش مصنوعی جدولی با تعداد ستون‌های ناهماهنگ در ردیف‌ها برگرداند. این ممکن است به دلیل پیچیدگی جدول باشد.");
    }

    return parsedData;
  } catch (error) {
    console.error("Error in Gemini service:", error);
    if (error instanceof Error) {
        const lowerCaseErrorMessage = error.message.toLowerCase();

        // A generic network error is the most common issue in cross-origin requests.
        // This can be caused by CORS (due to API key restrictions on referrers/IPs),
        // a firewall, a proxy, or an actual network failure.
        if (lowerCaseErrorMessage.includes('failed to fetch') || lowerCaseErrorMessage.includes('networkerror')) {
            throw new Error(
                "خطای اتصال: امکان برقراری ارتباط با سرویس هوش مصنوعی وجود ندارد. لطفاً اتصال اینترنت و تنظیمات فایروال خود را بررسی کنید. همچنین، مطمئن شوید کلید API شما برای استفاده از این دامنه یا IP محدود نشده باشد."
            );
        }

        // Specific message for invalid API keys, if the network request succeeds but auth fails.
        if (lowerCaseErrorMessage.includes("api key not valid")) {
            throw new Error("کلید API ارائه شده نامعتبر است. لطفاً با مدیر سیستم تماس بگیرید.");
        }
        
        // Re-throw any other specific error messages we've crafted inside the try block
        // or other unexpected errors from the SDK.
        throw error;
    }
    
    // Fallback for non-Error objects being thrown
    throw new Error("پردازش توسط هوش مصنوعی با یک خطای ناشناخته مواجه شد.");
  }
}