---
slug: inloggen-sessie-timeout
title: Inloggen en sessie
excerpt: Aanmelden, tweestapsverificatie, sessies en wachtwoordhulp.
category_slug: account-access
translation_group_id: 8e44c61b-c047-4914-9de6-e2608958c2ad
locale: nl
---

# Inloggen en sessie

Dit artikel beschrijft **aanmelden**, **tweestapsverificatie (MFA)**, **sessies** en **wachtwoordhulp**. De inlog-URL krijgt u van uw organisatie (bijvoorbeeld de staging- of productie-omgeving).

## Inloggen met e-mail en wachtwoord

1. Open de inlogpagina.
2. Vul **e-mail** en **wachtwoord** in.
3. Klik **Inloggen**.

> **Schermafbeelding (nog toe te voegen)**  
> Toon: inlogformulier met E-mail, Wachtwoord en Inloggen.  
> **Bestandsnaam:** `login-scherm.png`

## Tweestapsverificatie (authenticator)

Na een geldig wachtwoord vraagt de app om **tweestapsverificatie**. Dit is het live gedrag op de beveiligde omgevingen.

### Eerste keer instellen

1. Open uw authenticator-app (bijvoorbeeld Google Authenticator, Microsoft Authenticator of Authy).
2. Scan de **QR-code**, of voer de **handmatige code** in die onder de QR staat.
3. Vul de actuele **zescijferige code** in.
4. Klik **Bevestigen en doorgaan**.

> **Schermafbeelding (nog toe te voegen)**  
> Toon: scherm “Tweestapsverificatie instellen” met QR (geanonimiseerd).  
> **Bestandsnaam:** `login-mfa-setup.png`

### Bij volgende logins

1. Open de authenticator-app op uw telefoon.
2. Vul de actuele zescijferige code in.
3. Bevestig; daarna komt u op het **dashboard**.

Op een **testomgeving** kan bovenaan een oranje banner staan (bijv. dat wijzigingen productie niet raken).

## Sessie

U blijft ingelogd tot **uitloggen** of **timeout**. Op een gedeelde PC altijd **uitloggen** via het accountmenu onderaan het zijmenu.

## Wachtwoord

Gebruik **Wachtwoord vergeten?** op de loginpagina. Ingelogd wijzigen: [Wachtwoord wijzigen](/dashboard/help/a/wachtwoord-wijzigen).

## Problemen

- Blijft u op de loginpagina? Controleer e-mailadres en wachtwoord.
- MFA-code geweigerd: wacht tot de code ververst (meestal elke 30 seconden) en probeer opnieuw; controleer de tijd op uw telefoon.
- Melding dat een authenticator-factor al bestaat maar u geen code kunt bevestigen: vraag een beheerder om MFA voor uw account te resetten.
- Na login geen dashboard: meld bij admin of dien een [supportticket](/dashboard/help/a/support-ticket-indienen) in.

## Zie ook

- [Uitloggen en veiligheid](/dashboard/help/a/account-veiligheid-uitloggen)
- [Admin, gebruiker en back office](/dashboard/help/a/admin-vs-standaard-gebruiker)
- [Eerste stappen in de applicatie](/dashboard/help/a/eerste-stappen-in-de-app)
