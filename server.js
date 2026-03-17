/**
 * ClinicPro Backend - V1 Mínima Funcional
 * Endpoints: login, profile, clinic, dashboard
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'clinicpro-secret-key-2024';

// CORS - Permitir cualquier origen para desarrollo
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ==================== BASE DE DATOS EN MEMORIA ====================

const db = {
  clinics: [
    {
      id: 'clinic-001',
      name: 'Clínica Demo',
      slug: 'clinica-demo',
      description: 'Clínica de demostración',
      email: 'demo@clinicpro.com',
      phone: '+34 600 000 000',
      address: 'Calle Principal 123',
      city: 'Madrid',
      country: 'ES',
      logoUrl: null,
      primaryColor: '#0ea5e9',
      secondaryColor: '#6366f1',
      isActive: true,
      plan: 'free',
      whatsappEnabled: true,
      clientType: 'patient', // 'patient' | 'client' | 'customer' | 'guest'
      clientTypeLabel: 'Paciente', // Etiqueta personalizada
      professionalType: 'professional', // 'professional' | 'doctor' | 'stylist' | 'therapist'
      professionalTypeLabel: 'Profesional', // Etiqueta personalizada
      countryCode: '+598', // Uruguay por defecto
      createdAt: new Date().toISOString(),
    }
  ],
  users: [],
  patients: [],
  services: [],
  appointments: [],
  payments: [],
  professionals: [],
  timeBlocks: [], // Bloqueos de tiempo de profesionales
  providers: [], // Proveedores para egresos
  notifications: [], // Historial de notificaciones
  debts: [], // Deudas de pacientes
  professionalNotes: [], // Notas del profesional (historia clínica agnóstica)
  attachments: [], // Archivos adjuntos a notas
};

// ==================== DATOS DE PRUEBA ====================

async function initData() {
  // Super Admin
  const adminPass = await bcrypt.hash('admin123', 10);
  db.users.push({
    id: 'user-001',
    email: 'admin@clinicpro.com',
    password: adminPass,
    name: 'Administrador Principal',
    phone: '+34 600 000 001',
    role: 'SUPER_ADMIN',
    isActive: true,
    clinicId: null,
    createdAt: new Date().toISOString(),
  });

  // Admin de Clínica
  const clinicAdminPass = await bcrypt.hash('clinica123', 10);
  db.users.push({
    id: 'user-002',
    email: 'clinica@demo.com',
    password: clinicAdminPass,
    name: 'Admin Clínica Demo',
    phone: '+34 600 000 002',
    role: 'CLINIC_ADMIN',
    isActive: true,
    clinicId: 'clinic-001',
    createdAt: new Date().toISOString(),
  });

  // Staff
  const staffPass = await bcrypt.hash('staff123', 10);
  db.users.push({
    id: 'user-003',
    email: 'staff@demo.com',
    password: staffPass,
    name: 'Personal de Clínica',
    phone: '+34 600 000 003',
    role: 'STAFF',
    isActive: true,
    clinicId: 'clinic-001',
    createdAt: new Date().toISOString(),
  });

  // Pacientes de ejemplo
  db.patients.push(
    {
      id: 'patient-001',
      clinicId: 'clinic-001',
      firstName: 'Juan',
      lastName: 'García',
      email: 'juan@email.com',
      phone: '+34 611 111 111',
      address: 'Calle Mayor 1',
      city: 'Madrid',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'patient-002',
      clinicId: 'clinic-001',
      firstName: 'María',
      lastName: 'López',
      email: 'maria@email.com',
      phone: '+34 622 222 222',
      address: 'Avenida Central 2',
      city: 'Barcelona',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'patient-003',
      clinicId: 'clinic-001',
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      email: 'carlos@email.com',
      phone: '+34 633 333 333',
      address: 'Plaza España 3',
      city: 'Valencia',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  );

  // Servicios de ejemplo
  db.services.push(
    {
      id: 'service-001',
      clinicId: 'clinic-001',
      name: 'Consulta General',
      description: 'Consulta médica general',
      price: 50.00,
      duration: 30,
      category: 'consulta',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'service-002',
      clinicId: 'clinic-001',
      name: 'Revisión Completa',
      description: 'Revisión médica completa',
      price: 100.00,
      duration: 60,
      category: 'consulta',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'service-003',
      clinicId: 'clinic-001',
      name: 'Tratamiento Especializado',
      description: 'Tratamiento especializado',
      price: 150.00,
      duration: 45,
      category: 'tratamiento',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  );

  // Profesionales de ejemplo
  db.professionals.push(
    {
      id: 'prof-001',
      clinicId: 'clinic-001',
      firstName: 'Ana',
      lastName: 'Martínez',
      email: 'ana.martinez@clinica.com',
      phone: '+34 600 100 001',
      specialty: 'Estilista Senior',
      color: '#ef4444', // Rojo
      isActive: true,
      workingHours: {
        monday: { start: '09:00', end: '18:00' },
        tuesday: { start: '09:00', end: '18:00' },
        wednesday: { start: '09:00', end: '18:00' },
        thursday: { start: '09:00', end: '18:00' },
        friday: { start: '09:00', end: '18:00' },
        saturday: { start: '10:00', end: '14:00' },
        sunday: null,
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prof-002',
      clinicId: 'clinic-001',
      firstName: 'Laura',
      lastName: 'Gómez',
      email: 'laura.gomez@clinica.com',
      phone: '+34 600 100 002',
      specialty: 'Colorista',
      color: '#8b5cf6', // Violeta
      isActive: true,
      workingHours: {
        monday: { start: '10:00', end: '19:00' },
        tuesday: { start: '10:00', end: '19:00' },
        wednesday: { start: '10:00', end: '19:00' },
        thursday: { start: '10:00', end: '19:00' },
        friday: { start: '10:00', end: '19:00' },
        saturday: null,
        sunday: null,
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prof-003',
      clinicId: 'clinic-001',
      firstName: 'Carmen',
      lastName: 'Ruiz',
      email: 'carmen.ruiz@clinica.com',
      phone: '+34 600 100 003',
      specialty: 'Manicurista',
      color: '#06b6d4', // Cyan
      isActive: true,
      workingHours: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
        saturday: { start: '10:00', end: '14:00' },
        sunday: null,
      },
      createdAt: new Date().toISOString(),
    }
  );

  // Proveedores de ejemplo
  db.providers.push(
    {
      id: 'provider-001',
      clinicId: 'clinic-001',
      name: 'Distribuidora Médica S.A.',
      rut: '76.123.456-7',
      address: 'Av. Industrial 1234, Santiago',
      phone: '+56 2 2345 6789',
      email: 'ventas@distmedica.cl',
      contactName: 'Juan Pérez',
      notes: 'Proveedor principal de insumos médicos',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'provider-002',
      clinicId: 'clinic-001',
      name: 'Laboratorios Dentales Ltda.',
      rut: '76.987.654-3',
      address: 'Calle Los Andes 567, Providencia',
      phone: '+56 2 3456 7890',
      email: 'contacto@labdentales.cl',
      contactName: 'María González',
      notes: 'Prótesis dentales y laboratorio',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  );

  console.log('✅ Datos inicializados');
}

// ==================== MIDDLEWARE ====================

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.clinicId = decoded.clinicId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// ==================== ENDPOINTS ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const user = db.users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Usuario desactivado' });
    }

    // Generar token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        clinicId: user.clinicId 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Responder sin password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/profile
app.get('/api/auth/profile', authenticate, (req, res) => {
  const user = db.users.find(u => u.id === req.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const { password, ...userWithoutPassword } = user;
  
  // Incluir clínica si existe
  let response = { ...userWithoutPassword };
  if (user.clinicId) {
    const clinic = db.clinics.find(c => c.id === user.clinicId);
    if (clinic) {
      response.clinic = clinic;
    }
  }

  res.json(response);
});

// PUT /api/auth/profile
app.put('/api/auth/profile', authenticate, (req, res) => {
  const userIndex = db.users.findIndex(u => u.id === req.userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const { name, email, phone } = req.body;
  db.users[userIndex] = { 
    ...db.users[userIndex], 
    name: name || db.users[userIndex].name,
    email: email || db.users[userIndex].email,
    phone: phone || db.users[userIndex].phone,
    updatedAt: new Date().toISOString()
  };

  const { password, ...userWithoutPassword } = db.users[userIndex];
  res.json(userWithoutPassword);
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  const user = db.users.find(u => u.id === req.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.updatedAt = new Date().toISOString();

  res.json({ message: 'Contraseña actualizada exitosamente' });
});

// GET /api/clinics
app.get('/api/clinics', (req, res) => {
  res.json(db.clinics);
});

// GET /api/clinics/:id
app.get('/api/clinics/:id', authenticate, (req, res) => {
  const clinic = db.clinics.find(c => c.id === req.params.id);
  
  if (!clinic) {
    return res.status(404).json({ error: 'Clínica no encontrada' });
  }

  res.json(clinic);
});

// GET /api/clinics/slug/:slug
app.get('/api/clinics/slug/:slug', (req, res) => {
  const clinic = db.clinics.find(c => c.slug === req.params.slug);
  
  if (!clinic) {
    return res.status(404).json({ error: 'Clínica no encontrada' });
  }

  res.json(clinic);
});

// POST /api/clinics (solo Super Admin)
app.post('/api/clinics', authenticate, (req, res) => {
  if (req.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  const { clientType, clientTypeLabel, professionalType, professionalTypeLabel, countryCode, ...otherData } = req.body;
  
  const clinic = {
    id: `clinic-${Date.now()}`,
    ...otherData,
    clientType: clientType || 'patient',
    clientTypeLabel: clientTypeLabel || getDefaultClientTypeLabel(clientType || 'patient'),
    professionalType: professionalType || 'professional',
    professionalTypeLabel: professionalTypeLabel || getDefaultProfessionalTypeLabel(professionalType || 'professional'),
    countryCode: countryCode || '+598', // Uruguay por defecto
    isActive: true,
    plan: 'free',
    whatsappEnabled: true,
    createdAt: new Date().toISOString(),
  };
  
  db.clinics.push(clinic);
  res.status(201).json({ message: 'Clínica creada', clinic });
});

// Helper para obtener etiqueta de cliente por defecto
function getDefaultClientTypeLabel(type) {
  const labels = {
    patient: 'Paciente',
    client: 'Cliente',
    customer: 'Cliente',
    guest: 'Huésped',
    student: 'Estudiante',
    member: 'Miembro',
  };
  return labels[type] || 'Paciente';
}

// Helper para obtener etiqueta de profesional por defecto
function getDefaultProfessionalTypeLabel(type) {
  const labels = {
    professional: 'Profesional',
    doctor: 'Doctor',
    stylist: 'Estilista',
    therapist: 'Terapeuta',
    trainer: 'Entrenador',
    consultant: 'Consultor',
  };
  return labels[type] || 'Profesional';
}

// PUT /api/clinics/:id
app.put('/api/clinics/:id', authenticate, (req, res) => {
  const index = db.clinics.findIndex(c => c.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Clínica no encontrada' });
  }

  // Solo SUPER_ADMIN o CLINIC_ADMIN de esa clínica
  if (req.userRole !== 'SUPER_ADMIN' && req.clinicId !== req.params.id) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  db.clinics[index] = { 
    ...db.clinics[index], 
    ...req.body, 
    updatedAt: new Date().toISOString() 
  };
  
  res.json({ message: 'Clínica actualizada', clinic: db.clinics[index] });
});

// GET /api/dashboard
app.get('/api/dashboard', authenticate, (req, res) => {
  const clinicId = req.clinicId;
  
  // Para Super Admin sin clínica
  if (!clinicId) {
    return res.json({
      stats: {
        totalPatients: db.patients.length,
        totalServices: db.services.length,
        todayAppointments: 0,
        upcomingAppointments: 0,
        pendingAppointments: 0,
        completedThisMonth: 0,
        todayRevenue: 0,
        monthRevenue: 0,
        totalRevenue: 0,
        totalDebt: 0,
      },
      recent: {
        patients: [],
        appointments: [],
        payments: [],
      }
    });
  }

  const patients = db.patients.filter(p => p.clinicId === clinicId);
  const services = db.services.filter(s => s.clinicId === clinicId);
  const appointments = db.appointments.filter(a => a.clinicId === clinicId);
  const payments = db.payments.filter(p => p.clinicId === clinicId);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const todayAppointments = appointments.filter(a => a.date === todayStr);
  const monthPayments = payments.filter(p => {
    const paymentDate = new Date(p.paidAt);
    return paymentDate.getMonth() === today.getMonth() && 
           paymentDate.getFullYear() === today.getFullYear();
  });

  const recentPatients = patients.slice(-5).reverse();
  const recentAppointments = appointments.slice(-5).reverse().map(a => ({
    ...a,
    patient: patients.find(p => p.id === a.patientId),
    service: services.find(s => s.id === a.serviceId),
  }));

  // Calcular métricas por profesional
  const professionals = db.professionals.filter(p => p.clinicId === clinicId);
  const revenueByProfessional = professionals.map(prof => {
    // Citas completadas por este profesional
    const profAppointments = appointments.filter(a => a.professionalId === prof.id && a.status === 'COMPLETED');
    
    // Ingreso generado por citas (suma de precios de citas completadas)
    const profRevenue = profAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
    
    // Pagos recibidos asociados a citas de este profesional
    const profPayments = payments.filter(p => {
      // Pago directamente asociado a una cita
      if (p.appointmentId) {
        const relatedAppointment = appointments.find(a => a.id === p.appointmentId);
        return relatedAppointment && relatedAppointment.professionalId === prof.id;
      }
      // Pago asociado a una deuda que viene de una cita
      if (p.debtId) {
        const relatedDebt = db.debts.find(d => d.id === p.debtId);
        if (relatedDebt && relatedDebt.appointmentId) {
          const relatedAppointment = appointments.find(a => a.id === relatedDebt.appointmentId);
          return relatedAppointment && relatedAppointment.professionalId === prof.id;
        }
      }
      return false;
    });
    
    const totalReceived = profPayments.reduce((sum, p) => sum + p.amount, 0);
    
    return {
      professionalId: prof.id,
      professionalName: `${prof.firstName} ${prof.lastName}`,
      specialty: prof.specialty,
      appointmentsCount: profAppointments.length,
      revenue: profRevenue,
      received: totalReceived,
      pending: Math.max(0, profRevenue - totalReceived),
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Calcular métricas por servicio
  const revenueByService = services.map(svc => {
    const svcAppointments = appointments.filter(a => a.serviceId === svc.id && a.status === 'COMPLETED');
    const svcRevenue = svcAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
    
    return {
      serviceId: svc.id,
      serviceName: svc.name,
      appointmentsCount: svcAppointments.length,
      revenue: svcRevenue,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Calcular % de ocupación de agenda
  const calculateOccupancy = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Contar días hábiles del mes (Lun-Vie)
    let workingDays = 0;
    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) workingDays++;
    }
    
    // Asumir 8 horas por día por profesional
    const hoursPerDay = 8;
    
    // Calcular bloqueos de tiempo del mes (reducen disponibilidad)
    const monthTimeBlocks = db.timeBlocks.filter(b => {
      const blockDate = new Date(b.date);
      return b.clinicId === clinicId && blockDate >= startOfMonth && blockDate <= endOfMonth;
    });
    
    // Horas bloqueadas por profesional
    const blockedHoursByProfessional = {};
    monthTimeBlocks.forEach(block => {
      if (!blockedHoursByProfessional[block.professionalId]) {
        blockedHoursByProfessional[block.professionalId] = 0;
      }
      // Calcular horas bloqueadas (asumiendo formato HH:MM)
      const [startH, startM] = block.startTime.split(':').map(Number);
      const [endH, endM] = block.endTime.split(':').map(Number);
      const hours = (endH + endM / 60) - (startH + startM / 60);
      blockedHoursByProfessional[block.professionalId] += hours;
    });
    
    // Calcular slots disponibles restando bloqueos
    let totalAvailableSlots = 0;
    professionals.forEach(prof => {
      const profWorkingHours = hoursPerDay * workingDays;
      const profBlockedHours = blockedHoursByProfessional[prof.id] || 0;
      totalAvailableSlots += Math.max(0, profWorkingHours - profBlockedHours);
    });
    
    // Citas del mes actual
    const monthAppointments = appointments.filter(a => {
      const appDate = new Date(a.date);
      return appDate >= startOfMonth && appDate <= endOfMonth;
    });
    
    // Asumir que cada cita dura 1 hora en promedio
    const occupiedSlots = monthAppointments.length;
    
    const occupancyRate = totalAvailableSlots > 0 
      ? Math.round((occupiedSlots / totalAvailableSlots) * 100)
      : 0;
    
    return {
      occupancyRate,
      totalSlots: totalAvailableSlots,
      occupiedSlots,
      workingDays,
      blockedHours: Object.values(blockedHoursByProfessional).reduce((a, b) => a + b, 0),
    };
  };

  const occupancy = calculateOccupancy();

  // Calcular deuda total
  const clinicDebts = db.debts.filter(d => d.clinicId === clinicId);
  const totalDebt = clinicDebts
    .filter(d => d.status === 'PENDING' || d.status === 'PARTIAL')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  res.json({
    stats: {
      totalPatients: patients.length,
      totalServices: services.length,
      todayAppointments: todayAppointments.length,
      upcomingAppointments: appointments.filter(a => a.status === 'PENDING').length,
      pendingAppointments: appointments.filter(a => a.status === 'PENDING').length,
      completedThisMonth: appointments.filter(a => a.status === 'COMPLETED').length,
      todayRevenue: todayAppointments.reduce((sum, a) => sum + (a.price || 0), 0),
      monthRevenue: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
      totalDebt,
      occupancyRate: occupancy.occupancyRate,
    },
    analytics: {
      revenueByProfessional,
      revenueByService,
      occupancy,
    },
    recent: {
      patients: recentPatients,
      appointments: recentAppointments,
      payments: payments.slice(-5).reverse(),
    }
  });
});

// ==================== ENDPOINTS ADICIONALES (para completar) ====================

// GET /api/patients
app.get('/api/patients', authenticate, (req, res) => {
  let patients = req.clinicId 
    ? db.patients.filter(p => p.clinicId === req.clinicId)
    : db.patients;

  if (req.query.search) {
    const search = req.query.search.toLowerCase();
    patients = patients.filter(p => 
      p.firstName.toLowerCase().includes(search) ||
      p.lastName.toLowerCase().includes(search) ||
      p.email.toLowerCase().includes(search)
    );
  }

  res.json({ data: patients, pagination: { page: 1, limit: 100, total: patients.length, pages: 1 } });
});

// POST /api/patients
app.post('/api/patients', authenticate, (req, res) => {
  const patient = {
    id: `patient-${Date.now()}`,
    ...req.body,
    clinicId: req.clinicId,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  db.patients.push(patient);
  res.status(201).json({ message: 'Paciente creado', patient });
});

// GET /api/services
app.get('/api/services', authenticate, (req, res) => {
  let services = req.clinicId 
    ? db.services.filter(s => s.clinicId === req.clinicId)
    : db.services;

  if (req.query.active === 'true') {
    services = services.filter(s => s.isActive);
  }

  res.json(services);
});

// POST /api/services
app.post('/api/services', authenticate, (req, res) => {
  const service = {
    id: `service-${Date.now()}`,
    ...req.body,
    clinicId: req.clinicId,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  db.services.push(service);
  res.status(201).json({ message: 'Servicio creado', service });
});

// ==================== ENDPOINTS DE PROFESIONALES ====================

// GET /api/professionals - Listar profesionales
app.get('/api/professionals', authenticate, (req, res) => {
  let professionals = req.clinicId 
    ? db.professionals.filter(p => p.clinicId === req.clinicId)
    : db.professionals;

  if (req.query.active === 'true') {
    professionals = professionals.filter(p => p.isActive);
  }

  res.json(professionals);
});

// GET /api/professionals/:id - Obtener profesional por ID
app.get('/api/professionals/:id', authenticate, (req, res) => {
  const professional = db.professionals.find(p => p.id === req.params.id);
  
  if (!professional) {
    return res.status(404).json({ error: 'Profesional no encontrado' });
  }

  res.json(professional);
});

// POST /api/professionals - Crear profesional
app.post('/api/professionals', authenticate, (req, res) => {
  const professional = {
    id: `prof-${Date.now()}`,
    ...req.body,
    clinicId: req.clinicId,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  db.professionals.push(professional);
  res.status(201).json({ message: 'Profesional creado', professional });
});

// PUT /api/professionals/:id - Actualizar profesional
app.put('/api/professionals/:id', authenticate, (req, res) => {
  const index = db.professionals.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Profesional no encontrado' });
  }

  db.professionals[index] = { 
    ...db.professionals[index], 
    ...req.body, 
    updatedAt: new Date().toISOString() 
  };
  
  res.json({ message: 'Profesional actualizado', professional: db.professionals[index] });
});

// DELETE /api/professionals/:id - Eliminar profesional
app.delete('/api/professionals/:id', authenticate, (req, res) => {
  const index = db.professionals.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Profesional no encontrado' });
  }

  db.professionals.splice(index, 1);
  res.json({ message: 'Profesional eliminado' });
});

// ==================== ENDPOINTS DE BLOQUEO DE TIEMPO ====================

// GET /api/time-blocks - Listar bloqueos de tiempo
app.get('/api/time-blocks', authenticate, (req, res) => {
  let blocks = req.clinicId 
    ? db.timeBlocks.filter(b => b.clinicId === req.clinicId)
    : db.timeBlocks;

  if (req.query.professionalId) {
    blocks = blocks.filter(b => b.professionalId === req.query.professionalId);
  }

  if (req.query.date) {
    blocks = blocks.filter(b => b.date === req.query.date);
  }

  res.json(blocks);
});

// POST /api/time-blocks - Crear bloqueo de tiempo
app.post('/api/time-blocks', authenticate, (req, res) => {
  const { professionalId, date, startTime, endTime, reason, startDate, endDate } = req.body;
  
  // Si se proporciona un rango de fechas, crear múltiples bloqueos
  if (startDate && endDate) {
    const blocks = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const block = {
        id: `block-${Date.now()}-${d.getTime()}`,
        clinicId: req.clinicId,
        professionalId,
        date: d.toISOString().split('T')[0],
        startTime: startTime || '00:00',
        endTime: endTime || '23:59',
        reason: reason || 'Bloqueado',
        createdAt: new Date().toISOString(),
      };
      db.timeBlocks.push(block);
      blocks.push(block);
    }
    
    res.status(201).json({ 
      message: `${blocks.length} bloqueos creados`, 
      blocks,
      count: blocks.length
    });
    return;
  }
  
  // Bloqueo de un solo día
  const block = {
    id: `block-${Date.now()}`,
    clinicId: req.clinicId,
    professionalId,
    date,
    startTime,
    endTime,
    reason: reason || 'Bloqueado',
    createdAt: new Date().toISOString(),
  };
  
  db.timeBlocks.push(block);
  res.status(201).json({ message: 'Bloqueo creado', block });
});

// DELETE /api/time-blocks/:id - Eliminar bloqueo
app.delete('/api/time-blocks/:id', authenticate, (req, res) => {
  const index = db.timeBlocks.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Bloqueo no encontrado' });
  }

  db.timeBlocks.splice(index, 1);
  res.json({ message: 'Bloqueo eliminado' });
});

// GET /api/appointments
app.get('/api/appointments', authenticate, (req, res) => {
  let appointments = req.clinicId 
    ? db.appointments.filter(a => a.clinicId === req.clinicId)
    : db.appointments;

  // Filtrar por profesional si se especifica
  if (req.query.professionalId) {
    appointments = appointments.filter(a => a.professionalId === req.query.professionalId);
  }

  // Filtrar por fecha si se especifica
  if (req.query.date) {
    appointments = appointments.filter(a => a.date === req.query.date);
  }

  const patients = db.patients.filter(p => p.clinicId === req.clinicId);
  const services = db.services.filter(s => s.clinicId === req.clinicId);
  const professionals = db.professionals.filter(p => p.clinicId === req.clinicId);

  const appointmentsWithDetails = appointments.map(a => ({
    ...a,
    patient: patients.find(p => p.id === a.patientId),
    service: services.find(s => s.id === a.serviceId),
    professional: professionals.find(p => p.id === a.professionalId),
  }));

  res.json({ 
    data: appointmentsWithDetails, 
    pagination: { page: 1, limit: 100, total: appointments.length, pages: 1 } 
  });
});

// GET /api/appointments/today
app.get('/api/appointments/today', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let appointments = req.clinicId 
    ? db.appointments.filter(a => a.clinicId === req.clinicId && a.date === today)
    : db.appointments.filter(a => a.date === today);

  // Filtrar por profesional si se especifica
  if (req.query.professionalId) {
    appointments = appointments.filter(a => a.professionalId === req.query.professionalId);
  }

  const patients = db.patients.filter(p => p.clinicId === req.clinicId);
  const services = db.services.filter(s => s.clinicId === req.clinicId);
  const professionals = db.professionals.filter(p => p.clinicId === req.clinicId);

  const appointmentsWithDetails = appointments.map(a => ({
    ...a,
    patient: patients.find(p => p.id === a.patientId),
    service: services.find(s => s.id === a.serviceId),
    professional: professionals.find(p => p.id === a.professionalId),
  }));

  res.json(appointmentsWithDetails);
});

// POST /api/appointments
app.post('/api/appointments', authenticate, (req, res) => {
  const appointment = {
    id: `appointment-${Date.now()}`,
    ...req.body,
    clinicId: req.clinicId,
    status: 'PENDING',
    notificationSent: false,
    reminderSent: false,
    createdAt: new Date().toISOString(),
  };
  db.appointments.push(appointment);

  const patient = db.patients.find(p => p.id === appointment.patientId);
  const service = db.services.find(s => s.id === appointment.serviceId);
  const professional = db.professionals.find(p => p.id === appointment.professionalId);

  res.status(201).json({ 
    message: 'Cita creada', 
    appointment: { ...appointment, patient, service, professional }
  });
});

// GET /api/appointments/availability - Horarios disponibles
app.get('/api/appointments/availability', authenticate, (req, res) => {
  const { date, duration, professionalId } = req.query;
  
  if (!date || !duration) {
    return res.status(400).json({ error: 'Fecha y duración requeridas' });
  }

  const clinicId = req.clinicId;
  const durationMinutes = parseInt(duration);
  
  // Obtener profesional para saber sus horarios de trabajo
  let workingHours = { start: '09:00', end: '18:00' };
  if (professionalId) {
    const professional = db.professionals.find(p => p.id === professionalId);
    if (professional && professional.workingHours) {
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(date).getDay()];
      const dayHours = professional.workingHours[dayOfWeek];
      if (dayHours) {
        workingHours = dayHours;
      } else {
        // Profesional no trabaja ese día
        return res.json({ 
          date,
          professionalId,
          duration: durationMinutes,
          availableSlots: [],
          occupiedSlots: [],
          message: 'El profesional no trabaja este día'
        });
      }
    }
  }
  
  // Generar slots según horario del profesional
  const allSlots = [];
  const [startHour, startMin] = workingHours.start.split(':').map(Number);
  const [endHour, endMin] = workingHours.end.split(':').map(Number);
  const interval = 30;
  
  for (let hour = startHour; hour < endHour || (hour === endHour && 0 < endMin); hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      if (hour === endHour && minute >= endMin) break;
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      allSlots.push(time);
    }
  }
  
  // Obtener citas existentes para esa fecha y profesional
  let existingAppointments = clinicId 
    ? db.appointments.filter(a => a.clinicId === clinicId && a.date === date && a.status !== 'CANCELLED')
    : [];
  
  if (professionalId) {
    existingAppointments = existingAppointments.filter(a => a.professionalId === professionalId);
  }
  
  // Obtener bloqueos de tiempo para ese profesional y fecha
  const timeBlocks = professionalId
    ? db.timeBlocks.filter(b => b.professionalId === professionalId && b.date === date)
    : [];
  
  // Slots ocupados por citas
  const occupiedSlots = new Set(existingAppointments.map(a => a.time));
  
  // Slots bloqueados
  timeBlocks.forEach(block => {
    const [blockStartHour, blockStartMin] = block.startTime.split(':').map(Number);
    const [blockEndHour, blockEndMin] = block.endTime.split(':').map(Number);
    
    for (let hour = blockStartHour; hour <= blockEndHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        if (hour === blockStartHour && minute < blockStartMin) continue;
        if (hour === blockEndHour && minute >= blockEndMin) break;
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        occupiedSlots.add(time);
      }
    }
  });
  
  const availableSlots = allSlots.filter(slot => !occupiedSlots.has(slot));
  
  res.json({ 
    date,
    professionalId,
    duration: durationMinutes,
    availableSlots,
    occupiedSlots: Array.from(occupiedSlots),
    timeBlocks: timeBlocks.map(b => ({ start: b.startTime, end: b.endTime, reason: b.reason }))
  });
});

// GET /api/payments
app.get('/api/payments', authenticate, (req, res) => {
  let payments = req.clinicId 
    ? db.payments.filter(p => p.clinicId === req.clinicId)
    : db.payments;

  const patients = db.patients.filter(p => p.clinicId === req.clinicId);

  const paymentsWithDetails = payments.map(p => ({
    ...p,
    patient: patients.find(pt => pt.id === p.patientId),
  }));

  res.json({ 
    data: paymentsWithDetails, 
    pagination: { page: 1, limit: 100, total: payments.length, pages: 1 } 
  });
});

// POST /api/payments
app.post('/api/payments', authenticate, (req, res) => {
  const payment = {
    id: `payment-${Date.now()}`,
    ...req.body,
    clinicId: req.clinicId,
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.payments.push(payment);

  const patient = db.patients.find(p => p.id === payment.patientId);

  res.status(201).json({ 
    message: 'Pago registrado', 
    payment: { ...payment, patient }
  });
});

// DELETE /api/payments/:id - Eliminar pago
app.delete('/api/payments/:id', authenticate, (req, res) => {
  const index = db.payments.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Pago no encontrado' });
  }

  const payment = db.payments[index];
  
  if (req.clinicId && payment.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  db.payments.splice(index, 1);
  res.json({ message: 'Pago eliminado' });
});

// GET /api/payments/summary
app.get('/api/payments/summary', authenticate, (req, res) => {
  const payments = req.clinicId 
    ? db.payments.filter(p => p.clinicId === req.clinicId)
    : db.payments;
  
  const today = new Date().toISOString().split('T')[0];
  const todayPayments = payments.filter(p => p.paidAt.startsWith(today));
  
  const thisMonth = new Date().getMonth();
  const monthPayments = payments.filter(p => new Date(p.paidAt).getMonth() === thisMonth);

  res.json({
    today: todayPayments.reduce((sum, p) => sum + p.amount, 0),
    month: monthPayments.reduce((sum, p) => sum + p.amount, 0),
    year: payments.reduce((sum, p) => sum + p.amount, 0),
    total: payments.reduce((sum, p) => sum + p.amount, 0),
    pendingPayments: 0,
    byMethod: []
  });
});

// GET /api/users
app.get('/api/users', authenticate, (req, res) => {
  let users = db.users;
  
  if (req.userRole === 'CLINIC_ADMIN') {
    users = users.filter(u => u.clinicId === req.clinicId);
  }
  
  if (req.query.clinicId) {
    users = users.filter(u => u.clinicId === req.query.clinicId);
  }

  const usersWithoutPassword = users.map(u => {
    const { password, ...rest } = u;
    return rest;
  });

  res.json(usersWithoutPassword);
});

// POST /api/users
app.post('/api/users', authenticate, async (req, res) => {
  const { email, password, name, role, clinicId, phone } = req.body;
  
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'El email ya está registrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = {
    id: `user-${Date.now()}`,
    email,
    password: hashedPassword,
    name,
    role,
    clinicId: clinicId || req.clinicId,
    phone,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  
  db.users.push(user);
  
  const { password: _, ...userWithoutPassword } = user;
  res.status(201).json({ message: 'Usuario creado', user: userWithoutPassword });
});

// PUT /api/users/:id
app.put('/api/users/:id', authenticate, async (req, res) => {
  const index = db.users.findIndex(u => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const user = db.users[index];
  
  if (req.userRole === 'CLINIC_ADMIN' && user.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  const { password, ...updateData } = req.body;
  
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  db.users[index] = { ...user, ...updateData, updatedAt: new Date().toISOString() };
  
  const { password: _, ...userWithoutPassword } = db.users[index];
  res.json(userWithoutPassword);
});

// PATCH /api/appointments/:id/status - Cambiar estado de cita
app.patch('/api/appointments/:id/status', authenticate, (req, res) => {
  const { status } = req.body;
  const index = db.appointments.findIndex(a => a.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Cita no encontrada' });
  }

  const appointment = db.appointments[index];
  
  // Verificar que la cita pertenece a la clínica del usuario
  if (req.clinicId && appointment.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  db.appointments[index] = {
    ...appointment,
    status,
    updatedAt: new Date().toISOString(),
  };

  // Incluir datos relacionados en la respuesta
  const patient = db.patients.find(p => p.id === appointment.patientId);
  const service = db.services.find(s => s.id === appointment.serviceId);
  const professional = db.professionals.find(p => p.id === appointment.professionalId);

  res.json({
    message: 'Estado actualizado',
    appointment: { ...db.appointments[index], patient, service, professional }
  });
});

// GET /api/appointments/:id - Obtener cita por ID
app.get('/api/appointments/:id', authenticate, (req, res) => {
  const appointment = db.appointments.find(a => a.id === req.params.id);
  
  if (!appointment) {
    return res.status(404).json({ error: 'Cita no encontrada' });
  }

  if (req.clinicId && appointment.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  const patient = db.patients.find(p => p.id === appointment.patientId);
  const service = db.services.find(s => s.id === appointment.serviceId);
  const professional = db.professionals.find(p => p.id === appointment.professionalId);

  res.json({ ...appointment, patient, service, professional });
});

// PUT /api/appointments/:id - Actualizar cita
app.put('/api/appointments/:id', authenticate, (req, res) => {
  const index = db.appointments.findIndex(a => a.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Cita no encontrada' });
  }

  const appointment = db.appointments[index];
  
  if (req.clinicId && appointment.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  db.appointments[index] = {
    ...appointment,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  const patient = db.patients.find(p => p.id === db.appointments[index].patientId);
  const service = db.services.find(s => s.id === db.appointments[index].serviceId);
  const professional = db.professionals.find(p => p.id === db.appointments[index].professionalId);

  res.json({
    message: 'Cita actualizada',
    appointment: { ...db.appointments[index], patient, service, professional }
  });
});

// DELETE /api/appointments/:id - Eliminar cita
app.delete('/api/appointments/:id', authenticate, (req, res) => {
  const index = db.appointments.findIndex(a => a.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Cita no encontrada' });
  }

  const appointment = db.appointments[index];
  
  if (req.clinicId && appointment.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  db.appointments.splice(index, 1);
  res.json({ message: 'Cita eliminada' });
});

// ==================== ENDPOINTS DE PROVEEDORES ====================

// GET /api/providers - Listar proveedores
app.get('/api/providers', authenticate, (req, res) => {
  let providers = req.clinicId 
    ? db.providers.filter(p => p.clinicId === req.clinicId)
    : db.providers;

  if (req.query.active === 'true') {
    providers = providers.filter(p => p.isActive);
  }

  res.json(providers);
});

// GET /api/providers/:id - Obtener proveedor por ID
app.get('/api/providers/:id', authenticate, (req, res) => {
  const provider = db.providers.find(p => p.id === req.params.id);
  
  if (!provider) {
    return res.status(404).json({ error: 'Proveedor no encontrado' });
  }

  if (req.clinicId && provider.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  res.json(provider);
});

// POST /api/providers - Crear proveedor
app.post('/api/providers', authenticate, (req, res) => {
  const { name, rut, address, phone, email, contactName, notes } = req.body;
  
  const provider = {
    id: `provider-${Date.now()}`,
    clinicId: req.clinicId,
    name,
    rut: rut || '',
    address: address || '',
    phone: phone || '',
    email: email || '',
    contactName: contactName || '',
    notes: notes || '',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  
  db.providers.push(provider);
  res.status(201).json({ message: 'Proveedor creado', provider });
});

// PUT /api/providers/:id - Actualizar proveedor
app.put('/api/providers/:id', authenticate, (req, res) => {
  const index = db.providers.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Proveedor no encontrado' });
  }

  const provider = db.providers[index];
  
  if (req.clinicId && provider.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  db.providers[index] = {
    ...provider,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  
  res.json({ message: 'Proveedor actualizado', provider: db.providers[index] });
});

// DELETE /api/providers/:id - Eliminar proveedor
app.delete('/api/providers/:id', authenticate, (req, res) => {
  const index = db.providers.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Proveedor no encontrado' });
  }

  const provider = db.providers[index];
  
  if (req.clinicId && provider.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  db.providers.splice(index, 1);
  res.json({ message: 'Proveedor eliminado' });
});

// ==================== ENDPOINTS DE NOTIFICACIONES ====================

// GET /api/notifications - Listar notificaciones
app.get('/api/notifications', authenticate, (req, res) => {
  let notifications = req.clinicId 
    ? db.notifications.filter(n => n.clinicId === req.clinicId)
    : db.notifications;

  if (req.query.patientId) {
    notifications = notifications.filter(n => n.patientId === req.query.patientId);
  }

  if (req.query.status) {
    notifications = notifications.filter(n => n.status === req.query.status);
  }

  res.json({ 
    data: notifications.slice().reverse(), 
    pagination: { page: 1, limit: 100, total: notifications.length, pages: 1 } 
  });
});

// POST /api/notifications - Enviar notificación
app.post('/api/notifications', authenticate, (req, res) => {
  const { patientId, type, subject, message, appointmentId } = req.body;
  
  const patient = db.patients.find(p => p.id === patientId);
  
  if (!patient) {
    return res.status(404).json({ error: 'Paciente no encontrado' });
  }

  // Crear registro de notificación
  const notification = {
    id: `notification-${Date.now()}`,
    clinicId: req.clinicId,
    patientId,
    type,
    subject,
    message,
    appointmentId: appointmentId || null,
    status: 'SENT',
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  
  db.notifications.push(notification);

  // Generar URL de WhatsApp Web si es necesario
  let whatsappUrl = null;
  if (type === 'WHATSAPP' && patient.phone) {
    const cleanPhone = patient.phone.replace(/\D/g, '');
    whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  res.status(201).json({
    message: 'Notificación enviada',
    notification,
    whatsappUrl,
  });
});

// POST /api/notifications/reminders - Enviar recordatorios
app.post('/api/notifications/reminders', authenticate, (req, res) => {
  const { days = 1 } = req.body;
  
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  const dateStr = targetDate.toISOString().split('T')[0];
  
  const appointments = db.appointments.filter(a => 
    a.clinicId === req.clinicId && 
    a.date === dateStr && 
    (a.status === 'PENDING' || a.status === 'CONFIRMED') &&
    !a.reminderSent
  );

  const reminders = appointments.map(appointment => {
    const patient = db.patients.find(p => p.id === appointment.patientId);
    const service = db.services.find(s => s.id === appointment.serviceId);
    
    const message = `Hola ${patient?.firstName || ''},\n\nTe recordamos tu cita:\n\n📅 Fecha: ${appointment.date}\n🕐 Hora: ${appointment.time}\n🦷 Servicio: ${service?.name || ''}\n\nTe esperamos!`;

    const notification = {
      id: `notification-${Date.now()}-${appointment.id}`,
      clinicId: req.clinicId,
      patientId: appointment.patientId,
      type: 'WHATSAPP',
      subject: 'Recordatorio de cita',
      message,
      appointmentId: appointment.id,
      status: 'SENT',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    db.notifications.push(notification);
    
    // Marcar recordatorio como enviado
    const appIndex = db.appointments.findIndex(a => a.id === appointment.id);
    if (appIndex !== -1) {
      db.appointments[appIndex].reminderSent = true;
    }

    const cleanPhone = patient?.phone?.replace(/\D/g, '');
    const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` : null;

    return {
      appointment,
      notification,
      whatsappUrl,
    };
  });

  res.json({
    message: `${reminders.length} recordatorios enviados`,
    reminders,
  });
});

// GET /api/notifications/config - Verificar configuración de email
app.get('/api/notifications/config', authenticate, (req, res) => {
  res.json({
    configured: false,
    config: {
      publicKey: '',
      serviceId: '',
      templateId: '',
    },
  });
});

// ==================== ENDPOINTS DE DEUDAS ====================

// GET /api/debts - Listar deudas
app.get('/api/debts', authenticate, (req, res) => {
  let debts = req.clinicId 
    ? db.debts.filter(d => d.clinicId === req.clinicId)
    : db.debts;

  // Filtrar por paciente si se especifica
  if (req.query.patientId) {
    debts = debts.filter(d => d.patientId === req.query.patientId);
  }

  // Filtrar por estado
  if (req.query.status) {
    debts = debts.filter(d => d.status === req.query.status);
  }

  // Calcular totales
  const totalDebt = debts
    .filter(d => d.status === 'PENDING' || d.status === 'PARTIAL')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const totalPaid = debts
    .filter(d => d.status === 'PAID')
    .reduce((sum, d) => sum + d.amount, 0);

  // Incluir datos del paciente
  const debtsWithPatient = debts.map(debt => {
    const patient = db.patients.find(p => p.id === debt.patientId);
    return { ...debt, patient };
  });

  res.json({
    debts: debtsWithPatient,
    summary: {
      totalDebt,
      totalPaid,
      count: debts.length,
      pendingCount: debts.filter(d => d.status === 'PENDING').length,
    }
  });
});

// GET /api/debts/patient/:patientId - Obtener deudas de un paciente
app.get('/api/debts/patient/:patientId', authenticate, (req, res) => {
  const { patientId } = req.params;
  
  const patient = db.patients.find(p => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Paciente no encontrado' });
  }

  let debts = db.debts.filter(d => d.patientId === patientId);
  
  if (req.clinicId) {
    debts = debts.filter(d => d.clinicId === req.clinicId);
  }

  const totalDebt = debts
    .filter(d => d.status === 'PENDING' || d.status === 'PARTIAL')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  res.json({
    patient,
    debts,
    totalDebt,
  });
});

// POST /api/debts - Crear deuda
app.post('/api/debts', authenticate, (req, res) => {
  const { patientId, amount, reason, appointmentId, notes } = req.body;
  
  const patient = db.patients.find(p => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Paciente no encontrado' });
  }

  const debt = {
    id: `debt-${Date.now()}`,
    clinicId: req.clinicId,
    patientId,
    amount: parseFloat(amount),
    remainingAmount: parseFloat(amount),
    paidAmount: 0,
    reason: reason || 'Deuda pendiente',
    appointmentId: appointmentId || null,
    notes: notes || '',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  db.debts.push(debt);
  
  res.status(201).json({
    message: 'Deuda registrada',
    debt: { ...debt, patient }
  });
});

// POST /api/debts/:id/payment - Registrar pago de deuda
app.post('/api/debts/:id/payment', authenticate, (req, res) => {
  const { amount, method, notes } = req.body;
  const debtIndex = db.debts.findIndex(d => d.id === req.params.id);
  
  if (debtIndex === -1) {
    return res.status(404).json({ error: 'Deuda no encontrada' });
  }

  const debt = db.debts[debtIndex];
  
  if (req.clinicId && debt.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  const paymentAmount = parseFloat(amount);
  const newPaidAmount = debt.paidAmount + paymentAmount;
  const newRemainingAmount = debt.amount - newPaidAmount;

  // Determinar nuevo estado
  let newStatus = 'PARTIAL';
  if (newRemainingAmount <= 0) {
    newStatus = 'PAID';
  }

  db.debts[debtIndex] = {
    ...debt,
    paidAmount: newPaidAmount,
    remainingAmount: Math.max(0, newRemainingAmount),
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  // Crear registro de pago asociado
  const payment = {
    id: `payment-${Date.now()}`,
    clinicId: req.clinicId,
    patientId: debt.patientId,
    debtId: debt.id,
    appointmentId: debt.appointmentId, // Guardar referencia a la cita si existe
    amount: paymentAmount,
    method: method || 'CASH',
    concept: `Pago de deuda: ${debt.reason}`,
    notes: notes || '',
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  
  db.payments.push(payment);

  const patient = db.patients.find(p => p.id === debt.patientId);

  res.json({
    message: newStatus === 'PAID' ? 'Deuda saldada completamente' : 'Pago registrado',
    debt: { ...db.debts[debtIndex], patient },
    payment,
  });
});

// DELETE /api/debts/:id - Eliminar deuda
app.delete('/api/debts/:id', authenticate, (req, res) => {
  const index = db.debts.findIndex(d => d.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Deuda no encontrada' });
  }

  const debt = db.debts[index];
  
  if (req.clinicId && debt.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  db.debts.splice(index, 1);
  res.json({ message: 'Deuda eliminada' });
});

// ==================== ENDPOINTS DE NOTAS DEL PROFESIONAL ====================

// GET /api/professional-notes - Listar notas
app.get('/api/professional-notes', authenticate, (req, res) => {
  let notes = req.clinicId 
    ? db.professionalNotes.filter(n => n.clinicId === req.clinicId)
    : db.professionalNotes;

  if (req.query.patientId) {
    notes = notes.filter(n => n.patientId === req.query.patientId);
  }

  if (req.query.appointmentId) {
    notes = notes.filter(n => n.appointmentId === req.query.appointmentId);
  }

  // Incluir datos del paciente y profesional
  const notesWithData = notes.map(note => {
    const patient = db.patients.find(p => p.id === note.patientId);
    const professional = db.professionals.find(p => p.id === note.professionalId);
    const attachments = db.attachments.filter(a => a.noteId === note.id);
    return { ...note, patient, professional, attachments };
  });

  res.json(notesWithData);
});

// GET /api/professional-notes/:id - Obtener nota por ID
app.get('/api/professional-notes/:id', authenticate, (req, res) => {
  const note = db.professionalNotes.find(n => n.id === req.params.id);
  
  if (!note) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  if (req.clinicId && note.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  const patient = db.patients.find(p => p.id === note.patientId);
  const professional = db.professionals.find(p => p.id === note.professionalId);
  const attachments = db.attachments.filter(a => a.noteId === note.id);

  res.json({ ...note, patient, professional, attachments });
});

// POST /api/professional-notes - Crear nota
app.post('/api/professional-notes', authenticate, (req, res) => {
  const { patientId, appointmentId, professionalId, title, content, tags } = req.body;
  
  const patient = db.patients.find(p => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Paciente no encontrado' });
  }

  const note = {
    id: `note-${Date.now()}`,
    clinicId: req.clinicId,
    patientId,
    appointmentId: appointmentId || null,
    professionalId: professionalId || req.userId,
    title: title || 'Nota',
    content: content || '',
    tags: tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  db.professionalNotes.push(note);

  const professional = db.professionals.find(p => p.id === note.professionalId);

  res.status(201).json({
    message: 'Nota registrada',
    note: { ...note, patient, professional, attachments: [] }
  });
});

// PUT /api/professional-notes/:id - Actualizar nota
app.put('/api/professional-notes/:id', authenticate, (req, res) => {
  const index = db.professionalNotes.findIndex(n => n.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  const note = db.professionalNotes[index];
  
  if (req.clinicId && note.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  db.professionalNotes[index] = {
    ...note,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  const patient = db.patients.find(p => p.id === note.patientId);
  const professional = db.professionals.find(p => p.id === db.professionalNotes[index].professionalId);
  const attachments = db.attachments.filter(a => a.noteId === note.id);

  res.json({
    message: 'Nota actualizada',
    note: { ...db.professionalNotes[index], patient, professional, attachments }
  });
});

// DELETE /api/professional-notes/:id - Eliminar nota
app.delete('/api/professional-notes/:id', authenticate, (req, res) => {
  const index = db.professionalNotes.findIndex(n => n.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  const note = db.professionalNotes[index];
  
  if (req.clinicId && note.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  // Eliminar adjuntos asociados
  db.attachments = db.attachments.filter(a => a.noteId !== req.params.id);
  
  db.professionalNotes.splice(index, 1);
  res.json({ message: 'Nota eliminada' });
});

// POST /api/professional-notes/:id/attachments - Agregar adjunto
app.post('/api/professional-notes/:id/attachments', authenticate, (req, res) => {
  const note = db.professionalNotes.find(n => n.id === req.params.id);
  
  if (!note) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  if (req.clinicId && note.clinicId !== req.clinicId) {
    return res.status(403).json({ error: 'No tienes permisos' });
  }

  const { fileName, fileType, fileUrl, description } = req.body;

  const attachment = {
    id: `attachment-${Date.now()}`,
    noteId: req.params.id,
    fileName: fileName || 'archivo',
    fileType: fileType || 'application/octet-stream',
    fileUrl: fileUrl || '',
    description: description || '',
    uploadedBy: req.userId,
    createdAt: new Date().toISOString(),
  };
  
  db.attachments.push(attachment);

  res.status(201).json({
    message: 'Adjunto agregado',
    attachment
  });
});

// DELETE /api/attachments/:id - Eliminar adjunto
app.delete('/api/attachments/:id', authenticate, (req, res) => {
  const index = db.attachments.findIndex(a => a.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Adjunto no encontrado' });
  }

  db.attachments.splice(index, 1);
  res.json({ message: 'Adjunto eliminado' });
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ==================== START ====================

initData().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║           🏥 ClinicPro API Server v1.0.0               ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║  🌐 Server running on: http://0.0.0.0:${PORT}           ║
║  📊 Environment: ${process.env.NODE_ENV || 'development'}                    ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║  📧 Credenciales de prueba:                            ║
║                                                        ║
║  Super Admin:  admin@clinicpro.com / admin123          ║
║  Admin Clínica: clinica@demo.com / clinica123          ║
║  Staff:         staff@demo.com / staff123              ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
  });
});
