import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    // Configuration de base - on configurera l'email plus tard
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'test@example.com',
        pass: process.env.SMTP_PASS || 'password',
      },
    });
  }

  async sendWelcomeEmail(email: string, resetToken: string, role: string) {
    // const resetUrl = `${process.env.FRONTEND_URL}/auth/setup-account?token=${resetToken}`;
    const resetUrl = `http://localhost:3000/auth/test?token=${resetToken}`;
    const subject =
      role === 'ADMIN'
        ? `🔑 Configuration de votre compte Administrateur - ${process.env.APP_NAME}`
        : `🌾 Bienvenue dans l'équipe - ${process.env.APP_NAME}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5530;">
          ${role === 'ADMIN' ? '🔑 Configuration Administrateur' : "🌾 Bienvenue dans l'équipe !"}
        </h2>
        
        <p>Bonjour,</p>
        
        <p>
          ${
            role === 'ADMIN'
              ? 'Votre compte administrateur a été créé sur la plateforme HeberSenegal.'
              : "Vous avez été ajouté(e) à la plateforme HeberSenegal en tant qu'Agent de Terrain."
          }
        </p>
        
        <p><strong>⚠️ Action requise :</strong> Vous devez configurer vos informations de connexion.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4CAF50; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Configurer mon compte
          </a>
        </div>
        
        <p><strong>Ce lien expire dans 24 heures.</strong></p>
        
        <p>Si le bouton ne fonctionne pas, copiez ce lien :</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Email automatique de ${process.env.APP_NAME}
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@hebersenegal.com',
        to: email,
        subject,
        html,
      });
      console.log(`📧 Email envoyé à ${email}`);
    } catch (error) {
      console.log(`⚠️ Erreur email (normal en dev): ${error.message}`);
      // En développement, on affiche juste l'erreur sans planter
    }
  }
}
