import os
import json

from dotenv import load_dotenv
from groq import Groq


load_dotenv()


# =========================
# GROQ CLIENT
# =========================

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env")


client = Groq(api_key=api_key)

model = "openai/gpt-oss-120b"


# =========================
# ASK VISHALGPT
# =========================

def ask_vishalgpt(resume_text, question):

    system_prompt = """
You are VishalGPT.

You answer questions ONLY about Vishal's resume.

RULES:

1. Use ONLY information present in the resume.

2. You can answer questions about:
   - Education
   - Skills
   - Projects
   - Experience
   - Internships
   - Certifications
   - Achievements
   - Technologies
   - Any other information explicitly mentioned in the resume.

3. NEVER invent information.

4. NEVER use outside knowledge.

5. If the question is unrelated to Vishal's resume , say:

I can only answer questions related to Vishal's resume .

6. If the question is related to the resume but the information
is not present, say:

I don't have that information in the resume.

7. Return ONLY the answer as normal text.

8. DO NOT return JSON.

9. DO NOT return an object.

10. DO NOT return an array.

11. DO NOT use an "answer" field.

12. Keep the answer clear and concise.
"""


    user_prompt = f"""
Vishal's resume:

---------------- RESUME ----------------

{resume_text}

-------------- END RESUME --------------

Question:

{question}
"""


    # =========================
    # CALL GROQ
    # =========================

    response = client.chat.completions.create(

        model=model,

        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],

        temperature=0,

        stream=False
    )


    # =========================
    # GET COMPLETE RESPONSE
    # =========================

    content = response.choices[0].message.content


    print("\n========== GROQ RESPONSE ==========")
    print(content)
    print("====================================\n")


    # =========================
    # CLEAN JSON IF MODEL
    # STILL RETURNS JSON
    # =========================

    try:

        parsed = json.loads(content)

        # {"answer": [...]}

        if isinstance(parsed, dict):

            answer = parsed.get("answer")

            if isinstance(answer, list):
                return "".join(str(x) for x in answer)

            if isinstance(answer, str):
                return answer


        # ["I", " don't", " have"...]
        if isinstance(parsed, list):

            return "".join(str(x) for x in parsed)


    except json.JSONDecodeError:

        # It was already normal text
        pass


    return content