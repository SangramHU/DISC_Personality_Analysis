const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs'); // Import the file system module

const app = express(); // Define the app using express
const dbPath = path.join(__dirname, 'users.db'); // File-based SQLite database
const db = new sqlite3.Database(dbPath); // Persistent database

// Serve static files from the Dashboard folder
app.use('/Dashboard', express.static(path.join(__dirname, 'Dashboard')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // To handle JSON requests
app.use('/Style', express.static(path.join(__dirname, 'Style')));

// Serve the login page (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Create a users table if it doesn't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    `);
});

// Create the questions table if it doesn't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT,
            dominance TEXT,
            influence TEXT,
            steadiness TEXT,
            conscientiousness TEXT
        )
    `);
});

// Create the personality_test_progress table if it doesn't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS personality_test_progress (
            username TEXT,
            progress TEXT,
            score TEXT DEFAULT NULL,
            PRIMARY KEY (username)
        )
    `);
});

// Handle login requests
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.send(`
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const errorDiv = document.getElementById('login-error-message');
                    errorDiv.textContent = 'Please enter both username and password.';
                    errorDiv.style.display = 'block';
                });
            </script>
            ${fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8')}
        `);
    }

    // Check if the user is the admin
    if (username === 'sangram' && password === 'sangram') {
        return res.send(`
            <script>
                localStorage.setItem('username', '${username}');
                window.location.href = '/admin';
            </script>
        `);
    }

    // Check for regular users in the database
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) {
            res.status(500).send('Server error');
        } else if (row) {
            res.send(`
                <script>
                    localStorage.setItem('username', '${username}');
                    window.location.href = '/dashboard';
                </script>
            `);
        } else {
            res.send(`
                <script>
                    document.addEventListener('DOMContentLoaded', () => {
                        const errorDiv = document.getElementById('login-error-message');
                        errorDiv.textContent = 'Invalid username or password.';
                        errorDiv.style.display = 'block';
                    });
                </script>
                ${fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8')}
            `);
        }
    });
});

// Handle sign-up requests
app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.send(`
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const errorDiv = document.getElementById('signup-error-message');
                    errorDiv.textContent = 'Please enter both username and password.';
                    errorDiv.style.display = 'block';
                });
            </script>
            ${fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8')}
        `);
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
            res.status(500).send('Server error');
        } else if (row) {
            res.send(`
                <script>
                    document.addEventListener('DOMContentLoaded', () => {
                        const errorDiv = document.getElementById('signup-error-message');
                        errorDiv.textContent = 'Username already exists. Please choose a different one.';
                        errorDiv.style.display = 'block';
                    });
                </script>
                ${fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8')}
            `);
        } else {
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err) => {
                if (err) {
                    res.status(500).send('Error registering user');
                } else {
                    res.send(`
                        <script>
                            document.addEventListener('DOMContentLoaded', () => {
                                const errorDiv = document.getElementById('signup-error-message');
                                errorDiv.textContent = 'User registered successfully! You can now log in.';
                                errorDiv.style.color = 'green';
                                errorDiv.style.display = 'block';
                            });
                        </script>
                        ${fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8')}
                    `);
                }
            });
        }
    });
});

// Serve the dashboard page
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'Dashboard', 'dashboard.html'));
});

// Serve the admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin_Management', 'admin.html'));
});



// Serve the list users page
app.get('/list-users', (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin_Management', 'list_users.html'));
});

// API to fetch all users with their scores
app.get('/api/users', (req, res) => {
    db.all(
        `SELECT u.username, p.score 
         FROM users u 
         LEFT JOIN personality_test_progress p 
         ON u.username = p.username`,
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: 'Failed to fetch users' });
            } else {
                res.json(rows);
            }
        }
    );
});

// API to delete a user
app.delete('/api/users/:username', (req, res) => {
    const { username } = req.params;
    if (username === 'sangram') {
        return res.status(400).json({ message: 'Cannot delete admin user' });
    }
    db.run('DELETE FROM users WHERE username = ?', [username], function (err) {
        if (err) {
            res.status(500).json({ error: 'Failed to delete user' });
        } else {
            res.json({ message: 'User deleted successfully' });
        }
    });
});

// Serve the add question page
app.get('/add-question', (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin_Management', 'add_question.html'));
});

// Handle add question form submission
app.post('/add-question', (req, res) => {
    const { question, dominance, influence, steadiness, conscientiousness } = req.body;

    // Insert the new question into the database
    db.run(
        `INSERT INTO questions (question, dominance, influence, steadiness, conscientiousness) VALUES (?, ?, ?, ?, ?)`,
        [question, dominance, influence, steadiness, conscientiousness],
        (err) => {
            if (err) {
                res.status(500).send('Error saving the question to the database.');
            } else {
                res.send(`
                    <script>
                        alert('Question added successfully!');
                        window.location.href = '/add-question';
                    </script>
                `);
            }
        }
    );
});

// Serve the list questions page
app.get('/list-questions', (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin_Management', 'list_questions.html'));
});

app.get('/api/questions', (req, res) => {
    db.all('SELECT * FROM questions', (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Failed to fetch questions' });
        } else {
            res.json(rows);
        }
    });
});

// API to delete a question
app.delete('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM questions WHERE id = ?', [id], function (err) {
        if (err) {
            res.status(500).json({ error: 'Failed to delete question' });
        } else {
            res.json({ message: 'Question deleted successfully' });
        }
    });
});

// API to fetch 50 random questions
app.get('/api/personality_test/questions', (req, res) => {
    db.all('SELECT * FROM questions ORDER BY RANDOM() LIMIT 5', (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Failed to fetch questions' });
        } else {
            res.json(rows);
        }
    });
});

// API to submit the test
app.post('/api/personality_test/submit', (req, res) => {
    const { username, answers } = req.body;

    if (!answers || Object.keys(answers).length === 0) {
        return res.status(400).json({ error: 'No answers provided' });
    }

    const totalQuestions = Object.keys(answers).length;
    const categoryCounts = {
        dominance: 0,
        influence: 0,
        steadiness: 0,
        conscientiousness: 0,
    };

    Object.values(answers).forEach((response) => {
        if (categoryCounts[response] !== undefined) {
            categoryCounts[response]++;
        }
    });

    const dominancePercentage = Math.round((categoryCounts.dominance / totalQuestions) * 100);
    const influencePercentage = Math.round((categoryCounts.influence / totalQuestions) * 100);
    const steadinessPercentage = Math.round((categoryCounts.steadiness / totalQuestions) * 100);
    const conscientiousnessPercentage = Math.round((categoryCounts.conscientiousness / totalQuestions) * 100);

    const formattedScore = `${dominancePercentage}D${influencePercentage}I${steadinessPercentage}S${conscientiousnessPercentage}C`;

    db.run(
        `INSERT INTO personality_test_progress (username, progress, score)
         VALUES (?, NULL, ?)
         ON CONFLICT(username) DO UPDATE SET progress = NULL, score = ?`,
        [username, formattedScore, formattedScore],
        (err) => {
            if (err) {
                res.status(500).json({ error: 'Failed to submit test' });
            } else {
                res.json({ message: 'Test submitted successfully', score: formattedScore });
            }
        }
    );
});


// API to fetch a user's score
app.get('/api/personality_test/score', (req, res) => {
    const { username } = req.query;
    db.get('SELECT score FROM personality_test_progress WHERE username = ?', [username], (err, row) => {
        if (err) {
            res.status(500).json({ error: 'Failed to fetch score' });
        } else {
            res.json({ score: row ? row.score : 'No Score' });
        }
    });
});



require('dotenv').config();  // Load environment variables
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Import the Google Gemini AI SDK
app.use(bodyParser.json());
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Use API Key from .env

// Function to call Gemini AI
async function callGeminiAI(prompt) {
    console.log("Calling Gemini AI with prompt:");
    console.log(prompt);

    try {
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use a valid model
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log("Response from Gemini AI:", text);
        return text;
    } catch (error) {
        console.error("Error occurred while calling Gemini AI:", error);
        throw new Error("Failed to process the query with Gemini AI");
    }
}

// API endpoint to process chat queries
app.post("/api/chat", async (req, res) => {
    const { username, query } = req.body;

    if (!username || !query) {
        return res.status(400).json({ error: "Username and query are required" });
    }

    // Fetch the DISC score for the user
    db.get('SELECT score FROM personality_test_progress WHERE username = ?', [username], async (err, row) => {
        if (err) {
            console.error("Error fetching DISC score:", err);
            return res.status(500).json({ error: "Failed to fetch DISC score" });
        }

        if (!row || !row.score) {
            return res.status(400).json({ error: "DISC score not found. Please complete the personality test first." });
        }

        const discScore = row.score;

        // Generate the prompt for Gemini AI
        const prompt = `
            You are an expert behavioral AI using DISC personality analysis. The user has provided their DISC profile score:

            'D' = Dominance: ${discScore.split('D')[0]}%
            'I' = Influence: ${discScore.split('D')[1].split('I')[0]}%
            'S' = Steadiness: ${discScore.split('I')[1].split('S')[0]}%
            'C' = Conscientiousness: ${discScore.split('S')[1].split('C')[0]}%

            User's Query: ${query}

            Provide a response tailored to their DISC profile. Do not mention or discuss the DISC score in the response.
        `;

        try {
            const response = await callGeminiAI(prompt);
            res.json({ reply: response });
        } catch (error) {
            console.error("Error occurred while processing the chat query:", error);
            res.status(500).json({ error: "Failed to generate response" });
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
