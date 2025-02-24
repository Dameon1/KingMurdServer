require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic'); // Updated import
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize AI models
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const claude = new ChatAnthropic({ apiKey: process.env.CLAUDE_API_KEY }); // Updated constructor
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-1.5-flash' });

// Debate logic
async function runDebate(topic, rounds = 3, agents = [
  { name: 'GPT-4', model: openai, stance: 'pro' },
  // { name: 'Claude', model: claude, stance: 'con' },
  { name: 'Gemini', model: gemini, stance: 'neutral' },
]) {
  let debateLog = `Debate Topic: ${topic}\n\n`;
  for (let i = 0; i < rounds; i++) {
    for (const agent of agents) {
      const prompt = `You are ${agent.name}, arguing ${agent.stance} on "${topic}". Respond to the previous point or start your argument.`;
      let response;
      if (agent.name === 'Gemini') {
        const result = await agent.model.generateContent(prompt);
        response = result.response.text();
      } else {
        response = await agent.model.invoke(prompt); // Works for both OpenAI and ChatAnthropic
      }
      debateLog += `${agent.name} (${agent.stance}): ${response}\n\n`;
    }
  }
  return debateLog;
}

// API endpoint
app.post('/api/debate', async (req, res) => {
  const { topic, rounds, agents } = req.body;
  console.log('Debate request:', req.body);
  try {
    const debateLog = await runDebate(
      topic,
      rounds,
      agents.map(agent => ({
        name: agent.name,
        model: agent.name === 'GPT-4' ? openai : agent.name === 'Claude' ? claude : gemini,
        stance: agent.stance,
      }))
    );
    res.json({ debateLog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Debate failed' });
  }
});

// Health check
app.get('/health', (req, res) => res.send('Server is running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));