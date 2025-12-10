import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '')

export async function analyzePhotoForModeration(imageUrl: string): Promise<{
  suggestion: 'approve' | 'reject'
  confidence: number
  reason: string
}> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
  const prompt = `
You are an expert Trust & Safety content moderator for a general-audience social photo sharing platform. Your task is to analyze the input image and determine if it is safe and appropriate for a diverse user base, including families.

Review the image against the following detailed criteria:

**CRITERIA FOR APPROVAL (Safe Content):**
* **Social Interaction:** People smiling, talking, dancing, and interacting positively at events (weddings, birthdays, casual meetups).
* **Contextual Clothing:** Swimwear is acceptable ONLY if the context is appropriate (e.g., beach, pool, boat).
* **Standard Event Elements:** Food, decorations, venues, landscapes, pets present at events.
* **Social Drinking:** Images showing adults holding alcoholic beverages (beer, wine, cocktails) in a social, non-problematic setting are generally permitted.

**CRITERIA FOR REJECTION (Unsafe/Inappropriate Content):**
* **Explicit Nudity & Sexual Content:** Genitals, buttocks, uncovered female nipples (except breastfeeding). Explicit sexual acts, implied sexual activity, or overly sexualized poses/focal points, even if clothed.
* **Violence & Gore:** Real injuries, blood, dead bodies (human or animal), physical fighting, or realistic depictions of extreme violence.
* **Weapons & Threats:** Firearms, knives, or other deadly weapons displayed in a threatening manner or outside of a clear sporting/recreational context (like archery).
* **Drugs & Paraphernalia:** Illegal substances, hard drug use, or clear depictions of extreme intoxication/overdose. (Distinguish from standard social alcohol consumption).
* **Hate & Harassment:** Symbols indicating hate groups (e.g., swastikas), offensive gestures, or text within the image promoting hate speech.
* **PII (Personally Identifiable Information):** Clear images of credit cards, ID documents, or private phone numbers.

**OUTPUT FORMAT:**
You must respond strictly in raw JSON format with no additional text before or after. The JSON object must contain three keys:
* "decision": Either "APPROVE" or "REJECT".
* "confidence": A score between 0.00 and 1.00 representing your certainty.
* "reason": A concise explanation for the decision based on the criteria above.

Example of expected output for a rejection:
{
  "decision": "REJECT",
  "confidence": 0.98,
  "reason": "Contains threatening display of a firearm."
}
`;

    const result = await model.generateContent([prompt, { inlineData: { data: imageUrl, mimeType: 'image/jpeg' } }])
    const response = await result.response
    const text = response.text().trim()
    
    const parts = text.split(' ')
    const suggestion = parts[0].toLowerCase() as 'approve' | 'reject'
    const confidence = parseFloat(parts[1]) || 0.8
    const reason = parts.slice(2).join(' ') || 'Content analysis completed'
    
    return {
      suggestion: suggestion === 'approve' ? 'approve' : 'reject',
      confidence: Math.max(0, Math.min(1, confidence)),
      reason
    }
  } catch (error) {
    console.error('Gemini analysis error:', error)
    // Default to approval if analysis fails
    return {
      suggestion: 'approve',
      confidence: 0.5,
      reason: 'Analysis failed - defaulting to approve'
    }
  }
}

export async function processModerationQueue(photoUrl: string): Promise<{
  suggestion: 'approve' | 'reject'
  confidence: number
  reason: string
}> {
  return analyzePhotoForModeration(photoUrl)
}