
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { InventoryItem, Transaction, FunctionCall } from "../types";

// Function Declarations สำหรับ Google Sheets Integration
const recordIntakeFunctionDeclaration: FunctionDeclaration = {
  name: 'recordIntake',
  description: 'Records the intake of medical supplies into the ward inventory, simulating a write to Google Sheets. Use this when the user mentions receiving or adding supplies.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemName: { type: Type.STRING, description: 'The name of the medical supply, e.g., "หน้ากาก N95", "ถุงมือยาง Size M". Should match an existing item if possible, or be descriptive for a new item.' },
      quantity: { type: Type.NUMBER, description: 'The quantity of the item received. Must be a positive number.' },
      unit: { type: Type.STRING, description: 'The unit of the item (e.g., "ชิ้น", "กล่อง", "ขวด", "ชุด", "ม้วน"). Infer from context or default to "ชิ้น".' },
      source: { type: Type.STRING, description: 'The source or supplier of the item, e.g., "ห้องยา", "คลังกลาง", "บริษัท XYZ".' },
      remark: { type: Type.STRING, description: 'Any additional notes or details about the intake, e.g., batch number, expiration date, condition of goods.' },
    },
    required: ['itemName', 'quantity', 'unit', 'source'],
  },
};

const recordUsageFunctionDeclaration: FunctionDeclaration = {
  name: 'recordUsage',
  description: 'Records the usage of medical supplies from the ward inventory, simulating a write to Google Sheets. Use this when the user mentions using, dispensing, or cutting stock.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemName: { type: Type.STRING, description: 'The name of the medical supply, e.g., "หน้ากาก N95", "ถุงมือยาง Size M". Must be an existing item in the inventory.' },
      quantity: { type: Type.NUMBER, description: 'The quantity of the item used. Must be a positive number.' },
      unit: { type: Type.STRING, description: 'The unit of the item (e.g., "ชิ้น", "กล่อง", "ขวด", "ชุด", "ม้วน"). Infer from context or default to "ชิ้น".' },
      wardBed: { type: Type.STRING, description: 'The specific ward or bed number where the item was used, e.g., "เตียง 12", "Ward 5A", "ห้องฉุกเฉิน".' },
      remark: { type: Type.STRING, description: 'Any additional notes or details about the usage, e.g., patient condition, reason for urgent usage.' },
    },
    required: ['itemName', 'quantity', 'unit', 'wardBed'],
  },
};


// Main function to get AI stock insights (existing)
export const getStockInsights = async (inventory: InventoryItem[], transactions: Transaction[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    ในฐานะผู้ช่วยวิเคราะห์คลังสินค้าโรงพยาบาล โปรดวิเคราะห์ข้อมูลสต็อกปัจจุบันและรายการการใช้งานล่าสุดต่อไปนี้:
    
    สต็อกปัจจุบัน: ${JSON.stringify(inventory.map(i => ({ name: i.name, stock: i.currentStock, min: i.minLevel, unit: i.unit })))}
    รายการใช้งานล่าสุด: ${JSON.stringify(transactions.slice(-10).map(t => ({ name: t.itemName, qty: t.quantity, type: t.type, bed: t.bedNumber })))}
    
    โปรดสรุปเป็นข้อๆ สั้นๆ:
    1. รายการที่ต้องสั่งด่วน (โดยเฉพาะที่ต่ำกว่า minLevel)
    2. แนวโน้มการใช้งานที่ผิดปกติ (ถ้ามี)
    3. คำแนะนำในการจัดการคลัง
    ตอบเป็นภาษาไทย
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "ไม่มีข้อมูลวิเคราะห์ในขณะนี้";
  } catch (error) {
    console.error("Gemini Error in getStockInsights:", error);
    return "ไม่สามารถดึงข้อมูลวิเคราะห์ได้ในขณะนี้";
  }
};

/**
 * ประมวลผลคำสั่งจากผู้ใช้ด้วย Gemini AI เพื่อระบุฟังก์ชันที่ต้องการเรียกใช้
 * หรือตอบกลับด้วยข้อความปกติ
 * @param userPrompt คำสั่งภาษาธรรมชาติจากผู้ใช้
 * @param userName ชื่อผู้ใช้งานปัจจุบัน
 * @param availableItemNames รายชื่อพัสดุที่ใช้เป็นบริบทให้ AI
 * @returns Object ที่มี functionCall หรือ text
 */
export const processUserCommand = async (userPrompt: string, userName: string, availableItemNames: string[]): Promise<{ functionCall?: FunctionCall, text: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  // เพิ่ม System Instruction เพื่อให้ AI ทำงานได้ดีขึ้นกับบริบทของโรงพยาบาล
  // และเน้นให้เรียกใช้ฟังก์ชันเมื่อเหมาะสม
  const systemInstruction = `
    คุณคือผู้ช่วย AI สำหรับจัดการคลังพัสดุทางการแพทย์ในหอผู้ป่วย ชื่อ ${userName}
    ภารกิจหลักของคุณคือการวิเคราะห์คำสั่งของผู้ใช้และเรียกใช้ฟังก์ชันที่เหมาะสมเพื่อบันทึกข้อมูล
    หรือตอบคำถามที่เกี่ยวข้องกับสต็อกพัสดุ 
    
    รายการพัสดุที่มีในระบบปัจจุบัน (ใช้เป็นข้อมูลอ้างอิงในการระบุ itemName):
    ${availableItemNames.length > 0 ? availableItemNames.join(', ') : 'ไม่มีรายการพัสดุ'}

    หากคำสั่งของผู้ใช้คือการ "รับเข้า" หรือ "เพิ่ม" พัสดุ ให้ใช้ฟังก์ชัน recordIntake
    หากคำสั่งของผู้ใช้คือการ "เบิกใช้", "ตัดสต็อก", "ใช้", "จ่าย" พัสดุ ให้ใช้ฟังก์ชัน recordUsage
    
    พยายามระบุ itemName, quantity, unit, source/wardBed ให้ถูกต้องจากคำสั่งของผู้ใช้
    ถ้าข้อมูลไม่ครบถ้วนหรือไม่ชัดเจน ให้ขอข้อมูลเพิ่มเติมก่อนที่จะเรียกใช้ฟังก์ชัน
    ถ้าผู้ใช้ต้องการข้อมูลวิเคราะห์หรือถามคำถามทั่วไป ให้ตอบกลับเป็นข้อความ
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: [recordIntakeFunctionDeclaration, recordUsageFunctionDeclaration] }],
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      // Fix: Ensure that `text` property is always included in the returned object.
      // The text response from the AI may also contain conversational text along with the function call.
      return { 
        functionCall: response.functionCalls[0],
        text: response.text || "AI ตรวจพบและกำลังดำเนินการตามคำสั่งของคุณ." 
      };
    } else {
      // If no function call, return the text response
      return { text: response.text || "ฉันไม่เข้าใจคำสั่งของคุณ โปรดลองอีกครั้งในรูปแบบที่ชัดเจนขึ้น" };
    }
  } catch (error) {
    console.error("Gemini Error in processUserCommand:", error);
    // More user-friendly error messages based on common issues
    if (error instanceof Error && error.message.includes("candidate was blocked due to safety reasons")) {
      return { text: "คำสั่งของคุณถูกบล็อกเนื่องจากเหตุผลด้านความปลอดภัย โปรดลองใช้คำที่แตกต่างกัน" };
    }
    return { text: "เกิดข้อผิดพลาดทางเทคนิคในการเชื่อมต่อกับ AI โปรดลองอีกครั้ง" };
  }
};
