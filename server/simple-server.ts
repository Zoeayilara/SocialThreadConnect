import 'dotenv/config';
import express from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./production";

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://entreefox.netlify.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes BEFORE static files
registerRoutes(app).then(() => {
  console.log('Routes registered successfully');
}).catch(err => {
  console.error('Error registering routes:', err);
});

// Serve static files LAST (catch-all)
serveStatic(app);

const port = parseInt(process.env.PORT || '5000', 10);
app.listen(port, '0.0.0.0', () => {
  log(`Server running on port ${port}`);
});
