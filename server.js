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

    // Check for admin credentials
    if (username === 'sangram' && password === 'sangram') {
        return res.send(`
            <script>
                localStorage.setItem('username', '${username}');
                window.location.href = '/admin';
            </script>
        `);
    }

    // Check for regular user credentials
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
            // Render the login page with an error message
            res.send(`
                <script>
                    document.addEventListener('DOMContentLoaded', () => {
                        const errorDiv = document.getElementById('error-message');
                        errorDiv.textContent = 'Invalid username or password';
                        errorDiv.style.display = 'block';
                    });
                </script>
                ${fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8')}
            `);
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

// Handle sign-up requests
app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    // Check if the username already exists
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
            res.status(500).send('Server error');
        } else if (row) {
            // Render the login page with an error message for existing user
            res.send(`
                <script>
                    document.addEventListener('DOMContentLoaded', () => {
                        const errorDiv = document.getElementById('error-message');
                        errorDiv.textContent = 'Username already exists. Please choose a different one.';
                        errorDiv.style.display = 'block';
                    });
                </script>
                ${fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8')}
            `);
        } else {
            // Insert the new user into the database
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err) => {
                if (err) {
                    res.status(500).send('Error registering user');
                } else {
                    // Render the login page with a success message
                    res.send(`
                        <script>
                            document.addEventListener('DOMContentLoaded', () => {
                                const errorDiv = document.getElementById('error-message');
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

// API to handle chat queries
app.post('/api/chat', (req, res) => {
    const { username, query } = req.body;

    if (!username || !query) {
        return res.status(400).json({ error: 'Username and query are required' });
    }

    // Fetch the user's DISC score from the database
    db.get(
        `SELECT score FROM personality_test_progress WHERE username = ?`,
        [username],
        (err, row) => {
            if (err) {
                console.error('Error fetching DISC score:', err);
                return res.status(500).json({ error: 'Failed to fetch DISC score' });
            }

            if (!row || !row.score) {
                return res.status(404).json({ error: 'DISC score not found for the user' });
            }

            const DISC_SCORE = row.score;

            // Format the prompt for the Gemini AI model
            const prompt = `
                You are an expert behavioral AI utilizing DISC personality analysis. The user has provided their DISC profile score in the format aDbIcSdC, where:

                'a%' represents Dominance (D)
                'b%' represents Influence (I)
                'c%' represents Steadiness (S)
                'd%' represents Conscientiousness (C)

                Interpret the user’s DISC score to understand their behavioral tendencies, communication style, and decision-making approach. Then, answer their query in a way that aligns with their DISC profile, ensuring clarity, relevance, and personalization.

                User's DISC Score: ${DISC_SCORE}
                User's Query: ${query}

                Provide a detailed and insightful response tailored to the user’s DISC profile.
            `;

            // Call the Gemini AI model (replace with actual API call)
            callGeminiAI(prompt)
                .then(response => {
                    res.json({ reply: response });
                })
                .catch(error => {
                    console.error('Error calling Gemini AI:', error);
                    res.status(500).json({ error: 'Failed to process the query' });
                });
        }
    );
});

// Mock function to simulate Gemini AI API call
function callGeminiAI(prompt) {
    return new Promise((resolve) => {
        // Simulate AI response
        setTimeout(() => {
            resolve(`This is a simulated response based on the prompt: ${prompt}`);
        }, 1000);
    });
}

// Start the server
app.listen(80, () => {
    console.log('Server is running on http://localhost:80');
});