⚡ Form Automation Tools

A collection of browser extensions designed to automate repetitive data entry tasks on complex web forms. This repository contains two distinct tools tailored for different automation needs.

📂 Included Extensions

Extension

Purpose

Best For

1. Dropdown Autofiller

Mass-updates dropdown menus.

Forms requiring repetitive selection (e.g., setting 50 rows to "Yes").

2. Smart Form Filler

Intelligently fills text inputs.

Complex forms, government tenders, and table-based layouts using key-value mapping.

🛠 Extension 1: Dropdown Autofiller

A lightweight utility to instantly set all <select> dropdown elements on a page to a specific value.

Features

Bulk Update: Sets hundreds of dropdowns in milliseconds.

Case Insensitive: Typing "yes" matches "Yes", "YES", or "yes".

Event Triggering: Automatically fires change events to ensure page calculations (like Grand Totals) update immediately.

Usage

Click the extension icon.

Type the value you want to select (e.g., Yes, No, N/A).

Click Fill Dropdowns.

🧠 Extension 2: Smart Form Filler

An advanced automation tool that maps plain text data to form fields based on intelligent label matching. It is specifically engineered to handle complex table layouts often found in enterprise or government systems.

Features

Plain Text Mapping: Define your data in a simple Label : Value format.

Smart Table Detection: Accurately identifies labels in table headers even when the input field is in a different cell.

Strict Matching: Prevents incorrect overwrites (e.g., "Position" will not overwrite "Proposed Position").

Local Storage: Remembers your input data between sessions.

Safe Execution: Targets input and textarea fields while ignoring hidden fields.

Usage

Click the extension icon.

Paste your data in the following format:

Name : John Doe
Date of Birth : 01/01/1990
National ID : 123456789
Position : Manager


Click Autofill Form.

The script will scan the page, find matching labels, and fill the corresponding fields.

🚀 Installation Guide

Since these are developer tools, you can install them directly into Chrome, Edge, Brave, or Firefox without going through the store.

Chrome / Edge / Brave

Download or clone this repository.

Open your browser and navigate to chrome://extensions.

Enable Developer Mode (toggle in the top right).

Click Load Unpacked.

Select the specific folder for the extension you want to use (e.g., smart-form-filler).

Firefox

Open Firefox and navigate to about:debugging#/runtime/this-firefox.

Click Load Temporary Add-on...

Navigate to the extension folder and select the manifest.json file.

🔒 Privacy & Permissions

Storage: Used solely to save your input text locally on your machine so you don't have to re-type it.

ActiveTab/Scripting: Required to inject the autofill logic into the specific page you are viewing.

No Remote Tracking: These extensions run entirely offline. No data is sent to external servers.

📄 License

MIT License - Feel free to modify and distribute as needed.