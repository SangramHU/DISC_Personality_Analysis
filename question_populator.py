# import sqlite3
# import re

# # Database and file paths
# db_path = "users.db"
# questions_file_path = "questions_bank.txt"

# # Connect to the SQLite database
# conn = sqlite3.connect(db_path)
# cursor = conn.cursor()

# # Create the questions table if it doesn't exist
# cursor.execute("""
#     CREATE TABLE IF NOT EXISTS questions (
#         id INTEGER PRIMARY KEY AUTOINCREMENT,
#         question TEXT,
#         dominance TEXT,
#         influence TEXT,
#         steadiness TEXT,
#         conscientiousness TEXT
#     )
# """)

# # Function to parse questions from the text file
# def parse_questions(file_path):
#     with open(file_path, "r", encoding="utf-8") as file:
#         content = file.read()

#     # Split questions using the pattern for question numbers (e.g., "1.", "2.")
#     questions = re.split(r"\n\d+\.\s", content)
#     parsed_questions = []

#     for question in questions[1:]:  # Skip the first split as it's empty
#         lines = question.strip().split("\n")
#         if len(lines) >= 5:
#             question_text = lines[0].strip()
#             dominance = lines[1].replace("Dominance:", "").strip()
#             influence = lines[2].replace("Influence:", "").strip()
#             steadiness = lines[3].replace("Steadiness:", "").strip()
#             conscientiousness = lines[4].replace("Conscientiousness:", "").strip()
#             parsed_questions.append((question_text, dominance, influence, steadiness, conscientiousness))

#     return parsed_questions

# # Parse the questions from the file
# questions = parse_questions(questions_file_path)

# # Insert questions into the database
# for question in questions:
#     cursor.execute("""
#         INSERT INTO questions (question, dominance, influence, steadiness, conscientiousness)
#         VALUES (?, ?, ?, ?, ?)
#     """, question)

# # Commit the transaction and close the connection
# conn.commit()
# conn.close()

# print(f"Successfully populated the 'questions' table with {len(questions)} questions.")