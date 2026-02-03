# Entra ID Guest Invite Portal - Project Specification

This document contains the requirements and configuration steps for the Entra ID Guest Invite Portal, as synthesized during the planning phase.

## 🚀 Master Prompt for Project Initialization

### Overview
Build a simple, secure, standalone React application for frontline employees to send Entra ID Guest Invites. The goal is to allow non-technical staff to provide temporary access to an internal SaaS application by inviting guests directly into the company's Entra ID tenant.

### Persona & Security
- **Target User**: Frontline employees (non-technical).
- **Security Posture**: "Secure by Design". Authentication must be handled via Microsoft SSO (MSAL.js).
- **User Identity**: Frontline employees are members of the Entra ID tenant with MFA enabled.
- **Architecture**: Purely client-side (SPA) with no backend. The app interacts directly with the Microsoft Graph API using the user's delegated tokens.

### Functional Requirements
1.  **Multi-language Support**: Provide a toggle for English and Dutch (Nederlands). All UI elements, form labels, and error messages must be localized.
2.  **Simplified Invitation Form**:
    *   **Guest Name**: Text input (required).
    *   **Guest Email**: Email input (required).
    *   **Custom Message**: Textarea (optional) - to be included in the invitation email.
3.  **Microsoft Graph Integration**:
    *   Call the `POST /invitations` endpoint.
    *   Set `sendInvitationMessage: true`.
    *   Include the `inviteRedirectUrl` pointing to the target SaaS application.
4.  **Post-Invitation Feedback**:
    *   Display a clear success message.
    *   Display the `inviteRedeemUrl` (Redemption Link) so the employee can copy and send it manually if needed.
5.  **UI/UX Design**:
    *   Clean, minimalist, and mobile-responsive layout.
    *   Workflow: Login -> Invitation Form -> Success/Result screen.
    *   Use **Tailwind CSS** for styling and **Lucide-react** for icons.

### Technical Specifications
- **Framework**: React 19 + Vite + TypeScript.
- **Authentication**: `@azure/msal-react` and `@azure/msal-browser`.
- **API**: Microsoft Graph SDK or `fetch` with bearer tokens.
- **Styling**: Tailwind CSS.

---

## 🔐 Entra ID App Registration Guide

Follow these steps to register the application in your Entra ID tenant:

1.  **Create Registration**:
    *   Go to the [Azure Portal](https://portal.azure.com) > **Entra ID** > **App registrations** > **New registration**.
    *   **Name**: `Entra Guest Invite Portal`.
    *   **Supported account types**: `Accounts in this organizational directory only`.
2.  **Configure Platform**:
    *   Under **Authentication**, click **Add a platform** and select **Single-page application (SPA)**.
    *   **Redirect URIs**:
        *   For development: `http://localhost:5173`
        *   For production: The URL where you will host the app (e.g., `https://guest-portal.vercel.app`).
3.  **API Permissions**:
    *   Go to **API permissions** > **Add a permission** > **Microsoft Graph** > **Delegated permissions**.
    *   Search for and add:
        *   `User.Read` (to sign the user in).
        *   `User.Invite.All` (to send invitations).
    *   **Important**: Click **Grant admin consent for [Your Tenant]** to authorize these permissions for all users.
4.  **User Roles**:
    *   Ensure that the frontline employees using this portal have the **Guest Inviter** role assigned to them in Entra ID.
