import { initPremium, mailtoForm } from './fx.js';

initPremium();

const form = document.querySelector('[data-form]');
if (form) mailtoForm(form, { subject: (d) => `Consultation grands comptes — ${d.get('societe')}` });
