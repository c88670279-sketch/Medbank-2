const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const middleware = `
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err: any) {
    console.error('[Middleware] Database connection error:', err);
    res.status(500).json({ success: false, error: 'Database connection failed: ' + err.message });
  }
});
`;

code = code.replace(
  "app.use(express.urlencoded({ limit: '50mb', extended: true }));",
  "app.use(express.urlencoded({ limit: '50mb', extended: true }));\n" + middleware
);

fs.writeFileSync('server.ts', code);
