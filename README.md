# Pennywise — Student Money Tracker (Web Demo)

A polished browser-based version of the student money tracker, built with HTML, CSS, and vanilla JavaScript. It includes a responsive dashboard, searchable international phone input, demo OTP flow, income and rent setup, editable budget plan, expense add/edit/delete, category chart, and local spending observations.

## Files

```text
student_money_tracker_web/
├── index.html   # App structure and login/dashboard pages
├── styles.css   # Responsive visual styling
├── app.js       # Demo login, budgets, transactions, charts, and insights
└── README.md
```

## Run it

1. Open the `student_money_tracker_web` folder in VS Code.
2. Open `index.html` in a browser, or use VS Code's **Live Server** extension and choose **Open with Live Server**.
3. The page loads its phone country selector and fonts from CDNs, so an internet connection is needed for those visual elements. The tracker itself uses browser local storage.
4. Enter a phone number, choose **Send demo code**, then enter the code displayed on screen. This is a local demonstration; it does not send an SMS.
5. On first use, enter a name, monthly family support, and rent. For example: support ₹9,000 and rent ₹4,000 suggests ₹1,000 travel, ₹500 medical, and ₹1,000 savings, plus food, education, and flexible spending.

## What it does

- **Overview:** monthly support, expenses, remaining money, savings target, chart, plan progress, recent activity, and a local observation.
- **Transactions:** add expenses, search descriptions, filter by category/month, and edit/delete a transaction from its action menu.
- **Budget plan:** change per-category limits, save the plan, or recalculate the suggested starter amounts.
- **Smart insights:** points out high-spend and over-plan categories using local calculations only.
- **International phone input:** country search and dial code are provided by [intl-tel-input](https://intl-tel-input.com/docs/vanilla-javascript).

## Sign-in and data limitations

The OTP is a **demo code displayed in the browser**. It is not delivered by SMS and does not authenticate ownership of the entered phone number. A real SMS OTP needs a secure server-side endpoint and an SMS provider such as Twilio; credentials must never be put in browser JavaScript. This demo stores financial entries in `localStorage` in the current browser profile. They are not encrypted, do not sync across devices, and can be removed by clearing browser site data. Use **Exit demo** to return to the demo sign-in screen.

The smart observations are for spending tracking and planning only. They are not financial advice.
