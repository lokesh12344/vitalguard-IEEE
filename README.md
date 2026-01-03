# VitalGuard – Smart Remote Monitoring for Home-Based Patient Care

A React.js healthcare monitoring dashboard application with role-based views for Patients, Doctors, and Caretakers.

## Features

### Patient Dashboard
- Current health status with risk assessment (Low/Medium/High)
- Real-time vitals display (Heart Rate, Temperature, SpO₂, Blood Pressure)
- 24-hour vitals trend charts
- Medication adherence checklist
- Emergency SOS button with confirmation dialog
- Alert history section
- Daily health summary

### Doctor Dashboard
- Patient list sorted by risk priority (High-risk patients first)
- Color-coded risk badges
- Detailed patient view with:
  - Current vitals
  - 24-hour trend charts
  - Medication adherence timeline
  - Active alerts
  - Clinical notes

### Caretaker Dashboard
- Linked patients overview
- Current health status monitoring
- Emergency contact buttons
- Daily summary (medications, alerts)
- Alert notifications

## Tech Stack

- **React.js** (v18) - Functional components with hooks
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Card, Badge, Button, Dialog components
- **Chart.js** (via react-chartjs-2) - Vitals visualization
- **Lucide React** - Icons
- **Vite** - Build tool

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Navigate to the Frontend directory
cd Frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
Frontend/
├── src/
│   ├── components/
│   │   ├── ui/           # Base UI components (shadcn style)
│   │   │   ├── badge.jsx
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   └── dialog.jsx
│   │   ├── AlertBanner.jsx
│   │   ├── MedicationTracker.jsx
│   │   ├── PatientList.jsx
│   │   ├── RiskBadge.jsx
│   │   ├── SOSButton.jsx
│   │   ├── VitalsCard.jsx
│   │   └── VitalsChart.jsx
│   ├── layouts/
│   │   └── DashboardLayout.jsx
│   ├── pages/
│   │   ├── PatientDashboard.jsx
│   │   ├── DoctorDashboard.jsx
│   │   └── CaretakerDashboard.jsx
│   ├── mock/
│   │   ├── mockVitals.js
│   │   └── mockPatients.js
│   ├── lib/
│   │   └── utils.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Demo Mode

The application includes a **role switcher** in the header for demo purposes:
- Click on **Patient**, **Doctor**, or **Caretaker** to switch between views
- No authentication required - designed for presentations and demos

## Data Handling

- All data is mock/simulated for demonstration
- Code is structured for easy API integration:
  - Mock data files can be replaced with API calls
  - Components accept data as props
  - State management is centralized

## Design Guidelines

- Minimal, clean healthcare UI
- Light background (#f9fafb)
- Accessible font sizes (Inter font family)
- Color-coded risk indicators:
  - 🟢 Green: Low risk
  - 🟡 Yellow: Medium risk
  - 🔴 Red: High risk
- Responsive layout (desktop-first)

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## License

This project is for educational/demonstration purposes.
