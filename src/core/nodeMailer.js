import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.BREVO_USER, 
        pass: process.env.BREVO_PASSWORD,
        mcp: process.env.BREVO_MCP_KEY,
        api_key: process.env.BREVO_API_KEY
    },
    tls: {
        rejectUnauthorized: false
    }
});

export { transporter }