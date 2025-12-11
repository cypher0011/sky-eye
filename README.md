# Sky Eye - Remote Drone Operations Platform

🚁 **Production-grade Remote Drone Operations Platform** for emergency response, incident management, and autonomous drone-in-a-box operations.

![Sky Eye Platform](https://img.shields.io/badge/Status-Hackathon_Ready-success)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![React](https://img.shields.io/badge/React-18.2-61DAFB)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🎯 **Features**

###  **Mission Orchestration & Event Sourcing**
- ✅ Full mission lifecycle management (Created → Planned → Launched → On Scene → Completed)
- ✅ Event sourcing with complete mission timeline/replay capability
- ✅ Finite State Machines (FSM) for Drone and Hub states
- ✅ Route planning with geofence avoidance

### **Safety & Compliance**
- ✅ Comprehensive safety policy engine
- ✅ Geofencing (No-Fly, Caution, Privacy, Restricted zones)
- ✅ Pre-flight safety checks (battery, weather, GPS, link quality)
- ✅ Automatic failsafes (low battery auto-return, link-loss behavior)
- ✅ Safe landing zone selection

### **Real-Time Operations**
- ✅ Mock WebSocket telemetry service with reconnection logic
- ✅ Live telemetry streams (GPS, battery, link quality, motors, IMU)
- ✅ Fault injection and alerts
- ✅ Weather simulation affecting operations

### **Video/Thermal Intelligence**
- ✅ RGB + Thermal camera modes
- ✅ Snapshot capture with GPS/altitude metadata
- ✅ Hotspot detection (simulated thermal analytics)
- ✅ Broadcast messaging to incident area

### **Fleet Management**
- ✅ 12 Drone-in-a-Box hubs across Riyadh
- ✅ Hub health monitoring (door, charger, temperature, backup power)
- ✅ Drone health tracking (battery, motors, GPS, link quality)
- ✅ Auto-dispatch with priority routing

### **Authentication & RBAC**
- ✅ Role-based access control (Admin, Operator, Viewer)
- ✅ Permission system (22 granular permissions)
- ✅ Audit logging (all actions tracked)
- ✅ Session management with JWT-style tokens

### **Evidence & Reports**
- ✅ Mission evidence packages (JSON export)
- ✅ PDF mission reports with timeline and snapshots
- ✅ Chain of custody tracking
- ✅ Audit trail export

### **UI/UX**
- ✅ 3D drone view with manual controls (Three.js)
- ✅ 2D tactical map with real-time drone positions (Leaflet)
- ✅ Mission timeline visualization
- ✅ Toast notifications for real-time events
- ✅ Responsive dashboard

---

## 🚀 **Quick Start (One Command)**

```bash
# Install dependencies and run
npm install && npm run dev
```

Then open [http://localhost:5173](http://localhost:5173)

---

## 🔐 **Demo Accounts**

| Email                    | Password | Role     | Permissions                     |
|--------------------------|----------|----------|---------------------------------|
| `admin@skyeye.com`       | `demo`   | Admin    | All permissions                 |
| `operator@skyeye.com`    | `demo`   | Operator | Create missions, control drones |
| `viewer@skyeye.com`      | `demo`   | Viewer   | Read-only access                |

---

## 📸 **5-Minute Demo Script**

### **1. Login (30s)**
- Use `operator@skyeye.com` / `demo`
- Note the RBAC role displayed in top-right

### **2. Fleet Overview (30s)**
- Dashboard shows 12 hubs, all drones ready
- Statistics: 0 active incidents initially
- Map displays hub coverage areas and geofences

### **3. Create Incident (60s)**
- Click **"+"** button in dashboard
- Select "Building Fire" scenario
- Watch auto-dispatch kick in (or manually dispatch)
- Observe route planning avoiding no-fly zones (airport, military base)

### **4. Live Mission Operations (90s)**
- Watch drone launch sequence (hub door opens → takeoff → enroute)
- Click on flying drone to open Live Feed
- Toggle thermal vision
- Observe hotspot detection alerts
- Broadcast evacuation message
- Capture snapshot evidence

### **5. Safety Features (30s)**
- In live feed, note telemetry (battery, link quality, GPS)
- Trigger low battery → observe auto-return behavior
- Click "Timeline" button to see event sourcing

### **6. Evidence Export (30s)**
- Click "Export Report" button
- Download PDF mission report with:
  - Mission summary
  - Incident details
  - Full timeline
  - Snapshots captured
  - Audit trail

### **7. RBAC Demo (30s)**
- Logout
- Login as `viewer@skyeye.com`
- Note restricted UI (no dispatch, no export buttons)
- Logout, login as `admin@skyeye.com`
- Show all administrative features

### **8. Wrap-Up (30s)**
"This platform demonstrates enterprise-grade features: finite state machines, event sourcing, geofencing, safety policies, RBAC, audit logging, and evidence chain-of-custody – all production-ready patterns for real drone operations."

---

## 🏗️ **Architecture**

```
src/
├── types/               # TypeScript types & Zod schemas
│   ├── domain.ts       # Mission, Incident, Hub, Drone
│   ├── fsm.ts          # State machine definitions
│   ├── telemetry.ts    # Telemetry frame types
│   ├── safety.ts       # Geofence, safety policies
│   └── auth.ts         # User, roles, permissions
├── services/           # Business logic services
│   ├── MissionOrchestrator.ts   # Mission lifecycle + event sourcing
│   ├── SafetyPolicyEngine.ts    # Safety checks & policies
│   ├── GeofenceManager.ts       # Geofence operations
│   ├── TelemetryService.ts      # WebSocket telemetry (mock)
│   ├── AuthService.ts           # Authentication
│   ├── AuditLogger.ts           # Audit trail
│   └── EvidenceExporter.ts      # PDF/JSON export
├── store/              # Zustand state management
│   ├── authStore.ts
│   └── appStore.ts
├── components/         # React UI components
│   ├── Auth/          # Login screen
│   ├── Dashboard/     # Mission timeline
│   ├── Map/           # Leaflet 2D map
│   ├── 3D/            # Three.js drone view
│   └── UI/            # Dashboard, LiveFeed
└── tests/             # Vitest unit tests
```

---

## 🧪 **Testing**

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### **Test Coverage**
- ✅ FSM state transitions (Drone & Hub)
- ✅ Safety policy engine logic
- ✅ Geofence intersection detection
- ✅ Mission orchestration workflows
- ✅ Evidence export formats

---

## 📦 **Technology Stack**

| Category            | Technology                              |
|---------------------|-----------------------------------------|
| **Frontend**        | React 18, TypeScript, Vite              |
| **State**           | Zustand                                 |
| **3D Graphics**     | Three.js, @react-three/fiber            |
| **Maps**            | Leaflet, react-leaflet                  |
| **Validation**      | Zod                                     |
| **PDF Export**      | jsPDF, jspdf-autotable                  |
| **UI Components**   | Tailwind CSS, lucide-react              |
| **Notifications**   | react-hot-toast                         |
| **Testing**         | Vitest, @testing-library/react          |
| **Date Handling**   | date-fns                                |

---

## 🎨 **Key Technical Highlights**

### **1. Finite State Machines**
Drones and Hubs use explicit state machines with validated transitions:

```typescript
DOCKED → PREFLIGHT → LAUNCHING → ENROUTE → ON_SCENE → ORBIT → RETURNING → LANDING → DOCKED
```

### **2. Event Sourcing**
Every mission action is recorded as an immutable event:

```typescript
{
  id: "event-abc123",
  type: "HOTSPOT_DETECTED",
  timestamp: 1702345678000,
  actor: "operator@skyeye.com",
  payload: { temperature: 450, confidence: 0.92 }
}
```

### **3. Safety-First Design**
Launch blocked unless all checks pass:
- Battery > 30%
- Link quality > 50%
- GPS locked
- Hub ready
- Weather safe
- No geofence violations

### **4. Type Safety**
End-to-end type safety with TypeScript + Zod runtime validation:

```typescript
const IncidentSchema = z.object({
  type: z.enum(['FIRE', 'ACCIDENT', 'MEDICAL', 'SECURITY']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  // ... full validation
});
```

---

## 🚧 **Future Work (Post-Hackathon)**

### **Hardware Integration**
- [ ] DJI SDK integration for real drones
- [ ] Percepto/Airobotics drone-in-a-box hardware
- [ ] PX4 autopilot integration

### **Backend & Infrastructure**
- [ ] Real WebSocket server (Socket.io / Ably)
- [ ] PostgreSQL + Prisma for data persistence
- [ ] Redis for caching and pub/sub
- [ ] MinIO for video/image storage

### **Advanced AI**
- [ ] Real-time object detection (YOLO, TensorFlow)
- [ ] Thermal anomaly detection ML models
- [ ] Natural language mission commands

### **Enterprise Features**
- [ ] Multi-tenant support
- [ ] Integration with CAD/911 dispatch systems
- [ ] Compliance reporting (FAA, EASA)
- [ ] 5G/LTE drone connectivity
- [ ] Swarm coordination

---

## 🤝 **Contributing**

This is a hackathon prototype. For production use:
1. Replace mock services with real implementations
2. Add comprehensive error handling
3. Implement database persistence
4. Add E2E tests (Playwright/Cypress)
5. Security audit (penetration testing)
6. Load testing (k6, Artillery)

---

## 📄 **License**

MIT License - see LICENSE file

---

## 👏 **Acknowledgments**

Built with:
- React + Three.js communities
- Leaflet open-source mapping
- Anthropic Claude for architecture guidance

---

## 📞 **Demo Support**

For hackathon judges:
- All features are functional in the browser
- No backend required
- Data stored in browser localStorage
- Reset by clearing browser storage or refreshing page

**Have an amazing demo! 🚁🔥**
