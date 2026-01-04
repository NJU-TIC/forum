# NJUTIC Forum

<img width="2466" height="1790" alt="图片" src="https://github.com/user-attachments/assets/d2ac4262-7dd7-4eae-ad80-be90de589a01" />

<img width="2402" height="1608" alt="图片" src="https://github.com/user-attachments/assets/38cb212e-953b-487a-96ca-e8ac30f00073" />


## Development

### Prerequisites

- MongoDB (v7.0+)
- Bun (v1.0+)
- Node.js (v18+)

### Configuration

1. Copy the example configuration file:
   ```bash
   cp config.example.json config.json
   ```

2. Edit `config.json` with your actual configuration:
   - `resendApiKey`: Your Resend API key for sending emails
   - `allowedEmailSuffixes`: List of allowed email domains for registration
   - `mongoDbUri`: MongoDB connection string

3. Set environment variables (required for NextAuth):
   ```bash
   export NEXTAUTH_URL="http://localhost:3000"
   export NEXTAUTH_SECRET="your-secret-key-at-least-32-chars"
   ```
   
   You can generate a secret with: `openssl rand -base64 32`

   Or create a `.env.local` file:
   ```
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-at-least-32-chars
   ```

### Running the App

1. Start MongoDB:
   ```bash
   mongod --dbpath db_data/
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Run the development server:
   ```bash
   bun dev
   ```
