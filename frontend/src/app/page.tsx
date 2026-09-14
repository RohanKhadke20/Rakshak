'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Activity, 
  Server, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Search, 
  Terminal, 
  Settings, 
  Database, 
  Cpu, 
  HardDrive, 
  X, 
  RefreshCw,
  Play,
  Pause,
  Wifi,
  AlertOctagon,
  User,
  Lock,
  Mail,
  LogOut,
  Radio,
  Heart,
  Eye,
  EyeOff
} from 'lucide-react';

// Define Types to match Prisma schema
interface Alert {
  id: string;
  severity: string;
  message: string;
  resolved: boolean;
  nodeId: string;
  createdAt: string;
  node?: { name: string };
}

interface Node {
  id: string;
  name: string;
  ipAddress: string;
  status: string; // ONLINE, WARNING, OFFLINE
  cpuUsage: number;
  ramUsage: number;
  storageUsage: number;
  lastPing: string;
  alerts?: Alert[];
}

interface UserProfile {
  id: string;
  email: string;
  role: string; // NODE_OPERATOR, POLICE, HOSPITAL_ADMIN
  name: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// --- MOCK TELEMETRY DATA (Fallback & Simulation) ---
const DEFAULT_MOCK_NODES: Node[] = [
  { id: 'node-1', name: 'DB-Primary-01', ipAddress: '10.0.1.12', status: 'ONLINE', cpuUsage: 42.5, ramUsage: 78.2, storageUsage: 64.1, lastPing: new Date().toISOString(), alerts: [] },
  { id: 'node-2', name: 'API-Gateway-EU', ipAddress: '10.0.1.45', status: 'ONLINE', cpuUsage: 18.2, ramUsage: 45.8, storageUsage: 31.2, lastPing: new Date().toISOString(), alerts: [] },
  { id: 'node-3', name: 'Auth-Service-Node', ipAddress: '10.0.2.14', status: 'WARNING', cpuUsage: 89.1, ramUsage: 92.4, storageUsage: 45.0, lastPing: new Date().toISOString(), alerts: [] },
  { id: 'node-4', name: 'Log-Collector-Main', ipAddress: '10.0.5.88', status: 'ONLINE', cpuUsage: 55.4, ramUsage: 60.1, storageUsage: 88.5, lastPing: new Date().toISOString(), alerts: [] },
  { id: 'node-5', name: 'Web-Static-Mirror', ipAddress: '10.0.1.99', status: 'OFFLINE', cpuUsage: 0.0, ramUsage: 0.0, storageUsage: 12.0, lastPing: new Date(Date.now() - 3600000).toISOString(), alerts: [] },
  { id: 'node-h1', name: 'ICU-LifeSupport-Main', ipAddress: '192.168.4.10', status: 'ONLINE', cpuUsage: 12.5, ramUsage: 35.8, storageUsage: 15.0, lastPing: new Date().toISOString(), alerts: [] },
  { id: 'node-h2', name: 'Vaccine-ColdStorage-02', ipAddress: '192.168.4.44', status: 'ONLINE', cpuUsage: 8.2, ramUsage: 22.4, storageUsage: 8.5, lastPing: new Date().toISOString(), alerts: [] },
  { id: 'node-p1', name: 'Police-HQ-CCTV-Gateway', ipAddress: '172.16.8.5', status: 'ONLINE', cpuUsage: 76.4, ramUsage: 84.1, storageUsage: 91.2, lastPing: new Date().toISOString(), alerts: [] },
  { id: 'node-p2', name: 'Patrol-Comms-Repeater', ipAddress: '172.16.9.12', status: 'WARNING', cpuUsage: 62.1, ramUsage: 50.4, storageUsage: 42.0, lastPing: new Date().toISOString(), alerts: [] }
];

const DEFAULT_MOCK_ALERTS: Alert[] = [
  { id: 'alert-1', severity: 'CRITICAL', message: 'CPU consumption exceeded 85% limit on Auth-Service-Node', resolved: false, nodeId: 'node-3', createdAt: new Date(Date.now() - 600000).toISOString(), node: { name: 'Auth-Service-Node' } },
  { id: 'alert-2', severity: 'WARNING', message: 'High RAM usage (92%) detected on Auth-Service-Node', resolved: false, nodeId: 'node-3', createdAt: new Date(Date.now() - 900000).toISOString(), node: { name: 'Auth-Service-Node' } },
  { id: 'alert-3', severity: 'INFO', message: 'Database mirror sync completed for DB-Primary-01', resolved: true, nodeId: 'node-1', createdAt: new Date(Date.now() - 1800000).toISOString(), node: { name: 'DB-Primary-01' } },
  { id: 'alert-4', severity: 'CRITICAL', message: 'Temperature threshold high (4.2°C) on Vaccine-ColdStorage-02', resolved: false, nodeId: 'node-h2', createdAt: new Date(Date.now() - 300000).toISOString(), node: { name: 'Vaccine-ColdStorage-02' } },
  { id: 'alert-5', severity: 'WARNING', message: 'Storage capacity above 90% on Police-HQ-CCTV-Gateway', resolved: false, nodeId: 'node-p1', createdAt: new Date(Date.now() - 400000).toISOString(), node: { name: 'Police-HQ-CCTV-Gateway' } }
];

export default function App() {
  // Session States
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});

  // Navigation state (Inside dashboard views)
  const [activeTab, setActiveTab] = useState<'overview' | 'nodes' | 'alerts'>('overview');
  
  // Telemetry Data State
  const [nodes, setNodes] = useState<Node[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // App Modes & Connection Telemetry
  const [isMockMode, setIsMockMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State for new Node
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeIp, setNewNodeIp] = useState('');
  const [newNodeStatus, setNewNodeStatus] = useState('ONLINE');

  // Load session state on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('rakshak_token');
    const savedUser = localStorage.getItem('rakshak_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch Telemetry Data (Secured endpoints)
  const fetchTelemetryData = useCallback(async (authToken: string) => {
    setIsLoading(true);
    setConnectionError(null);
    try {
      // Fetch Nodes
      const nodesRes = await fetch(`${BACKEND_URL}/nodes`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (nodesRes.status === 401) {
        handleLogout();
        throw new Error('Session expired or unauthorized');
      }
      if (!nodesRes.ok) throw new Error('Failed to fetch nodes');
      const nodesData = await nodesRes.json();
      
      // Fetch Alerts
      const alertsRes = await fetch(`${BACKEND_URL}/alerts`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!alertsRes.ok) throw new Error('Failed to fetch alerts');
      const alertsData = await alertsRes.json();

      setNodes(nodesData);
      setAlerts(alertsData);
      setIsMockMode(false);
    } catch (err: any) {
      console.warn('Backend API connection failed, switching to local mock data. Error:', err.message);
      setConnectionError(err.message || 'Could not connect to Express backend API');
      setIsMockMode(true);
      
      // Initialize telemetry states with local mock if empty
      if (nodes.length === 0) {
        setNodes(DEFAULT_MOCK_NODES);
        setAlerts(DEFAULT_MOCK_ALERTS);
      }
    } finally {
      setIsLoading(false);
    }
  }, [nodes.length]);

  // Load telemetry when user logs in
  useEffect(() => {
    if (token) {
      fetchTelemetryData(token);
    }
  }, [token, fetchTelemetryData]);

  // Simulated metrics updating periodically (Mock Mode/Client-side preview)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setNodes(prevNodes => 
        prevNodes.map(node => {
          if (node.status === 'OFFLINE') return node;
          
          // Random fluctuations for active nodes
          const deltaCpu = (Math.random() - 0.5) * 8;
          const deltaRam = (Math.random() - 0.5) * 4;
          
          const newCpu = Math.min(100, Math.max(5, node.cpuUsage + deltaCpu));
          const newRam = Math.min(100, Math.max(10, node.ramUsage + deltaRam));
          
          // Determine status based on thresholds
          let updatedStatus = 'ONLINE';
          if (newCpu > 85 || newRam > 90) {
            updatedStatus = 'WARNING';
          }

          // Trigger automated mock alert if status changes to warning and not already alerted
          if (updatedStatus === 'WARNING' && node.status === 'ONLINE' && isMockMode) {
            const newAlertId = `alert-auto-${Date.now()}`;
            const newAlert: Alert = {
              id: newAlertId,
              severity: newCpu > 92 ? 'CRITICAL' : 'WARNING',
              message: `High utilization anomaly detected on ${node.name}: CPU ${newCpu.toFixed(1)}%, RAM ${newRam.toFixed(1)}%`,
              resolved: false,
              nodeId: node.id,
              createdAt: new Date().toISOString(),
              node: { name: node.name }
            };
            setAlerts(prev => [newAlert, ...prev]);
          }

          return {
            ...node,
            cpuUsage: parseFloat(newCpu.toFixed(1)),
            ramUsage: parseFloat(newRam.toFixed(1)),
            lastPing: new Date().toISOString(),
            status: updatedStatus
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [isSimulating, isMockMode]);

  // --- CLIENT SIDE AUTHENTICATION VALIDATION ---
  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- AUTH SUBMISSION LOGIC ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Secure Session storage
      localStorage.setItem('rakshak_token', data.token);
      localStorage.setItem('rakshak_user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      setIsMockMode(false);
      setAuthError(null);
    } catch (err: any) {
      console.warn('Backend login connection failed, falling back to mock authentication. Error:', err.message);
      
      // MOCK AUTHENTICATION FALLBACK
      // If backend is offline, check preconfigured credentials to enable quick frontend evaluation.
      const mockUsers = [
        { email: 'operator@rakshak.local', password: 'operator123', name: 'Rohan (Mock Operator)', role: 'NODE_OPERATOR' },
        { email: 'police@rakshak.local', password: 'police123', name: 'Inspector Vijay (Mock Police)', role: 'POLICE' },
        { email: 'hospital@rakshak.local', password: 'hospital123', name: 'Dr. Alok (Mock Admin)', role: 'HOSPITAL_ADMIN' }
      ];

      const matchedMockUser = mockUsers.find(u => u.email === email && u.password === password);
      
      if (matchedMockUser) {
        const dummyToken = `mock-jwt-token-${Date.now()}`;
        const dummyProfile: UserProfile = {
          id: `mock-${matchedMockUser.role.toLowerCase()}`,
          email: matchedMockUser.email,
          name: matchedMockUser.name,
          role: matchedMockUser.role
        };
        
        localStorage.setItem('rakshak_token', dummyToken);
        localStorage.setItem('rakshak_user', JSON.stringify(dummyProfile));
        
        setToken(dummyToken);
        setUser(dummyProfile);
        setIsMockMode(true);
      } else {
        setAuthError(err.message || 'Invalid credentials or connection error.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- LOGOUT LOGIC ---
  const handleLogout = async () => {
    if (token && !isMockMode) {
      try {
        await fetch(`${BACKEND_URL}/auth/logout`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          }
        });
      } catch (err) {
        console.warn('Backend logout cleanup skipped (offline):', err);
      }
    }
    
    // Clear Session State
    localStorage.removeItem('rakshak_token');
    localStorage.removeItem('rakshak_user');
    setToken(null);
    setUser(null);
    setEmail('');
    setPassword('');
    setNodes([]);
    setAlerts([]);
    setActiveTab('overview');
  };

  // Quick seed selection helper
  const handleQuickSeedSelect = (seedEmail: string, seedPass: string) => {
    setEmail(seedEmail);
    setPassword(seedPass);
    setValidationErrors({});
    setAuthError(null);
  };

  // --- DATABASE WRITE MUTATIONS (SECURED RBAC) ---
  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName || !newNodeIp) return;

    // RBAC: Verify role has permission
    if (user?.role !== 'NODE_OPERATOR') {
      alert('Access Denied: Only Node Operators can register new nodes.');
      return;
    }

    const payload = {
      name: newNodeName,
      ipAddress: newNodeIp,
      status: newNodeStatus,
      cpuUsage: newNodeStatus === 'OFFLINE' ? 0.0 : Math.floor(Math.random() * 40) + 10,
      ramUsage: newNodeStatus === 'OFFLINE' ? 0.0 : Math.floor(Math.random() * 50) + 20,
      storageUsage: Math.floor(Math.random() * 60) + 10
    };

    if (isMockMode) {
      const mockNewNode: Node = {
        id: `node-${Date.now()}`,
        ...payload,
        lastPing: new Date().toISOString(),
        alerts: []
      };
      setNodes(prev => [...prev, mockNewNode]);
      setIsModalOpen(false);
      resetNodeForm();
    } else {
      try {
        const res = await fetch(`${BACKEND_URL}/nodes`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create node');
        
        await fetchTelemetryData(token!);
        setIsModalOpen(false);
        resetNodeForm();
      } catch (err: any) {
        alert(`Failed to create node: ${err.message}`);
      }
    }
  };

  const resetNodeForm = () => {
    setNewNodeName('');
    setNewNodeIp('');
    setNewNodeStatus('ONLINE');
  };

  const handleResolveAlert = async (id: string) => {
    // RBAC: Verify roles
    if (user?.role !== 'NODE_OPERATOR' && user?.role !== 'POLICE') {
      alert('Access Denied: Only Node Operators and Police Personnel can resolve incidents.');
      return;
    }

    if (isMockMode) {
      setAlerts(prev => 
        prev.map(alert => alert.id === id ? { ...alert, resolved: true } : alert)
      );
    } else {
      try {
        const res = await fetch(`${BACKEND_URL}/alerts/${id}/resolve`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to resolve alert');
        await fetchTelemetryData(token!);
      } catch (err: any) {
        alert(`Failed to resolve alert: ${err.message}`);
      }
    }
  };

  const triggerMockAlert = () => {
    const activeNodes = nodes.filter(n => n.status !== 'OFFLINE');
    if (activeNodes.length === 0) return;
    const randomNode = activeNodes[Math.floor(Math.random() * activeNodes.length)];
    const severities = ['INFO', 'WARNING', 'CRITICAL'];
    const chosenSeverity = severities[Math.floor(Math.random() * severities.length)];
    
    const newAlert: Alert = {
      id: `alert-manual-${Date.now()}`,
      severity: chosenSeverity,
      message: `Role anomaly checkpoint activated. Node ${randomNode.name} logged security state: ${chosenSeverity}.`,
      resolved: false,
      nodeId: randomNode.id,
      createdAt: new Date().toISOString(),
      node: { name: randomNode.name }
    };
    
    setAlerts(prev => [newAlert, ...prev]);
  };

  // Filtered telemetry
  const totalNodesCount = nodes.length;
  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const criticalAlertsCount = unresolvedAlerts.filter(a => a.severity === 'CRITICAL').length;

  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          node.ipAddress.includes(searchQuery);
    
    // Filter hospital-specific nodes or general ones based on role if desired
    const matchesStatus = statusFilter === 'ALL' || node.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Role details mapping
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'NODE_OPERATOR': return 'Node Systems Operator';
      case 'POLICE': return 'Police Security Personnel';
      case 'HOSPITAL_ADMIN': return 'Hospital Systems Admin';
      default: return 'User Account';
    }
  };

  // --- VIEW RENDERING ENGINE ---

  // 1. LOGIN INTERFACE (Unauthenticated)
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-[#04060b] text-slate-200 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        {/* Glow Decors */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

        {/* LOGO */}
        <div className="flex items-center gap-3.5 mb-8 z-10 animate-fadeIn">
          <div className="bg-gradient-to-tr from-cyan-500 to-indigo-600 p-3 rounded-xl text-white shadow-[0_0_25px_rgba(6,182,212,0.45)]">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent leading-none">
              RAKSHAK
            </h1>
            <p className="text-[10px] text-cyan-500 font-mono tracking-widest uppercase mt-1">Multi-Role Security Guard</p>
          </div>
        </div>

        {/* LOGIN CONTAINER */}
        <div className="w-full max-w-md bg-[#0a0f1d] border border-[#1e293b] rounded-2xl shadow-2xl p-8 z-10 animate-zoomIn relative">
          
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-100">Secure Access Portal</h2>
            <p className="text-xs text-slate-400 mt-1">Enter credentials to authenticate session</p>
          </div>

          {authError && (
            <div className="mb-5 p-3.5 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-400 flex items-start gap-2.5">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* EMAIL */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Authorized Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setValidationErrors(prev => ({ ...prev, email: undefined })); }}
                  placeholder="name@rakshak.local"
                  className={`w-full bg-[#0d1326] border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 transition-all ${
                    validationErrors.email ? 'border-red-500 focus:ring-red-500/50' : 'border-[#1e293b] focus:border-cyan-500/70 focus:ring-cyan-500/30'
                  }`}
                />
              </div>
              {validationErrors.email && (
                <p className="text-[10px] text-red-400 font-mono">{validationErrors.email}</p>
              )}
            </div>

            {/* PASSWORD */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Security Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setValidationErrors(prev => ({ ...prev, password: undefined })); }}
                  placeholder="••••••••"
                  className={`w-full bg-[#0d1326] border rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 transition-all ${
                    validationErrors.password ? 'border-red-500 focus:ring-red-500/50' : 'border-[#1e293b] focus:border-cyan-500/70 focus:ring-cyan-500/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-[10px] text-red-400 font-mono">{validationErrors.password}</p>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-[0_4px_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Access Dashboard'
              )}
            </button>

          </form>

          {/* QUICK CREDENTIAL SEEDS */}
          <div className="mt-8 pt-6 border-t border-[#1e293b]/70 space-y-3">
            <h4 className="text-[10px] text-slate-400 font-mono uppercase tracking-wider text-center">Quick Role Simulation Access</h4>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => handleQuickSeedSelect('operator@rakshak.local', 'operator123')}
                className="w-full text-left p-2.5 rounded-lg bg-[#0e162d] hover:bg-[#152044] border border-[#1e293b]/60 flex justify-between items-center text-xs transition-colors group"
              >
                <div>
                  <span className="font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">Node Operator</span>
                  <p className="text-[10px] text-slate-500 font-mono">operator@rakshak.local / operator123</p>
                </div>
                <Activity className="h-4 w-4 text-cyan-500" />
              </button>
              
              <button 
                onClick={() => handleQuickSeedSelect('police@rakshak.local', 'police123')}
                className="w-full text-left p-2.5 rounded-lg bg-[#0e162d] hover:bg-[#152044] border border-[#1e293b]/60 flex justify-between items-center text-xs transition-colors group"
              >
                <div>
                  <span className="font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">Police Personnel</span>
                  <p className="text-[10px] text-slate-500 font-mono">police@rakshak.local / police123</p>
                </div>
                <Radio className="h-4 w-4 text-amber-500" />
              </button>

              <button 
                onClick={() => handleQuickSeedSelect('hospital@rakshak.local', 'hospital123')}
                className="w-full text-left p-2.5 rounded-lg bg-[#0e162d] hover:bg-[#152044] border border-[#1e293b]/60 flex justify-between items-center text-xs transition-colors group"
              >
                <div>
                  <span className="font-semibold text-slate-200 group-hover:text-rose-400 transition-colors">Hospital Administrator</span>
                  <p className="text-[10px] text-slate-500 font-mono">hospital@rakshak.local / hospital123</p>
                </div>
                <Heart className="h-4 w-4 text-rose-500" />
              </button>
            </div>
          </div>

        </div>

        <p className="text-[10px] text-slate-600 font-mono mt-8">RAKSHAK SECURE AUTHENTICATION // AGENTIC MONITORING</p>
      </div>
    );
  }

  // --- MONITORED DASHBOARD LAYOUTS (AUTHENTICATED VIEWS) ---
  return (
    <div className="flex h-screen bg-[#05080f] text-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#080d19] border-r border-[#1e293b] flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-[#1e293b] flex items-center gap-3">
            <div className="bg-gradient-to-tr from-cyan-500 to-indigo-600 p-2 rounded-lg text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-wider bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                RAKSHAK
              </h1>
              <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">Secured Monitor</p>
            </div>
          </div>

          {/* Active User profile box */}
          <div className="m-4 p-3.5 bg-slate-900/60 border border-[#1e293b]/60 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-mono font-bold text-xs uppercase border border-slate-700">
                {user.name.charAt(0)}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-200 truncate leading-none">{user.name}</p>
                <span className="text-[9px] font-mono text-cyan-400 uppercase font-semibold block mt-1 tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links - Dynamically filtered or customized tabs based on Role */}
          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'overview' 
                  ? 'bg-gradient-to-r from-cyan-950 to-slate-900 border-l-2 border-cyan-500 text-cyan-400 shadow-[inset_0_0_12px_rgba(6,182,212,0.1)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f172a]'
              }`}
            >
              {user.role === 'POLICE' ? <Radio className="h-4.5 w-4.5" /> : user.role === 'HOSPITAL_ADMIN' ? <Heart className="h-4.5 w-4.5" /> : <Activity className="h-4.5 w-4.5" />}
              {user.role === 'POLICE' ? 'Dispatch Console' : user.role === 'HOSPITAL_ADMIN' ? 'Medical Core' : 'Operations Center'}
            </button>
            
            <button 
              onClick={() => setActiveTab('nodes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'nodes' 
                  ? 'bg-gradient-to-r from-cyan-950 to-slate-900 border-l-2 border-cyan-500 text-cyan-400 shadow-[inset_0_0_12px_rgba(6,182,212,0.1)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f172a]'
              }`}
            >
              <Server className="h-4.5 w-4.5" />
              {user.role === 'HOSPITAL_ADMIN' ? 'Hospital Grid' : 'Cluster Nodes'}
              <span className="ml-auto text-xs bg-slate-800 text-slate-300 py-0.5 px-1.5 rounded-full font-mono">
                {nodes.length || '0'}
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('alerts')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'alerts' 
                  ? 'bg-gradient-to-r from-cyan-950 to-slate-900 border-l-2 border-cyan-500 text-cyan-400 shadow-[inset_0_0_12px_rgba(6,182,212,0.1)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f172a]'
              }`}
            >
              <AlertTriangle className="h-4.5 w-4.5" />
              Incidents Logs
              {unresolvedAlerts.length > 0 && (
                <span className="ml-auto text-xs bg-red-950 border border-red-800 text-red-400 py-0.5 px-2 rounded-full font-mono animate-pulse">
                  {unresolvedAlerts.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Revocation */}
        <div className="p-4 border-t border-[#1e293b] bg-[#060b13] space-y-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Auth Layer</span>
            {isMockMode ? (
              <span className="text-amber-500 font-semibold">LOCAL MOCK</span>
            ) : (
              <span className="text-emerald-400 font-semibold">JWT + PRISMA</span>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-[#1e293b] rounded-lg text-xs font-semibold text-slate-300 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Revoke Session
          </button>
        </div>
      </aside>

      {/* DYNAMIC DASHBOARD ENGINE */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-[#080d19] border-b border-[#1e293b] flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <span className="text-[10px] bg-slate-800 font-mono tracking-wider text-cyan-400 px-2 py-1 rounded">
                ROLE: {user.role}
              </span>
              <span>{getRoleDisplayName(user.role)}</span>
            </h2>
            
            {isMockMode && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-950/40 border border-amber-900/50 rounded-full text-[10px] text-amber-400 font-mono">
                <AlertOctagon className="h-3.5 w-3.5" />
                Backend Offline (Simulated State)
              </span>
            )}
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isSimulating 
                  ? 'bg-cyan-950/20 border-cyan-800 text-cyan-400 hover:bg-cyan-900/30' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {isSimulating ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {isSimulating ? 'Simulating' : 'Static'}
            </button>

            <button 
              onClick={() => fetchTelemetryData(token)}
              className="p-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {isMockMode && (
              <button 
                onClick={triggerMockAlert}
                className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-400 rounded-lg text-xs font-mono"
              >
                Simulate Incident
              </button>
            )}
          </div>
        </header>

        {/* MAIN DISPLAY VIEW */}
        <main className="flex-1 overflow-y-auto bg-[#04060b] p-8">
          
          {/* TAB 1: OVERVIEW PAGE */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* --- ROLE BASED LANDING COMPONENT --- */}
              {/* VIEW A: NODE_OPERATOR DASHBOARD */}
              {user.role === 'NODE_OPERATOR' && (
                <div className="space-y-6">
                  {/* Banner */}
                  <div className="p-6 bg-gradient-to-r from-[#0d162d] to-[#080d19] border border-cyan-500/20 rounded-xl relative overflow-hidden">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 opacity-5 pointer-events-none">
                      <Cpu className="h-48 w-48 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-200">Hardware Telemetry Cluster Operations</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      Welcome, {user.name}. As a Node Operator, you have full privileges to register new servers, track raw hardware alerts, toggle diagnostics, and resolve operational warning overrides.
                    </p>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#080d19] border border-[#1e293b] p-5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">ONLINE NODES</span>
                        <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                          {nodes.filter(n => n.status === 'ONLINE').length} / {nodes.length}
                        </h3>
                      </div>
                      <Server className="h-8 w-8 text-emerald-500/30" />
                    </div>

                    <div className="bg-[#080d19] border border-[#1e293b] p-5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">UNRESOLVED INCIDENTS</span>
                        <h3 className="text-2xl font-bold text-rose-500 mt-1">
                          {unresolvedAlerts.length}
                        </h3>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-rose-500/30" />
                    </div>

                    <div className="bg-[#080d19] border border-[#1e293b] p-5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">DIAGNOSTIC STATUS</span>
                        <h3 className="text-2xl font-bold text-cyan-400 mt-1">ACTIVE</h3>
                      </div>
                      <Activity className="h-8 w-8 text-cyan-500/30" />
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW B: POLICE PERSONNEL DASHBOARD */}
              {user.role === 'POLICE' && (
                <div className="space-y-6">
                  {/* Banner */}
                  <div className="p-6 bg-gradient-to-r from-[#201511] to-[#080d19] border border-amber-500/20 rounded-xl relative overflow-hidden">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 opacity-5 pointer-events-none">
                      <Radio className="h-48 w-48 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-200">Incident Security Dispatch Board</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      Welcome, {user.name}. Your account is equipped with security incident supervisor capabilities. Monitor critical service outages, identify database integrity warnings, and mark incidents resolved once cleared on-ground.
                    </p>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#080d19] border border-[#1e293b] p-5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">CRITICAL INCIDENTS</span>
                        <h3 className="text-2xl font-bold text-red-500 mt-1">{criticalAlertsCount} Active</h3>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-500/30 animate-pulse" />
                    </div>

                    <div className="bg-[#080d19] border border-[#1e293b] p-5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">TOTAL INCIDENTS TRACKED</span>
                        <h3 className="text-2xl font-bold text-slate-300 mt-1">{alerts.length} Registered</h3>
                      </div>
                      <Terminal className="h-8 w-8 text-slate-500/30" />
                    </div>

                    <div className="bg-[#080d19] border border-[#1e293b] p-5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">OPERATIONAL DISPATCH</span>
                        <h3 className="text-2xl font-bold text-amber-400 mt-1">ONLINE</h3>
                      </div>
                      <Radio className="h-8 w-8 text-amber-500/30" />
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW C: HOSPITAL ADMINISTRATOR DASHBOARD */}
              {user.role === 'HOSPITAL_ADMIN' && (
                <div className="space-y-6">
                  {/* Banner */}
                  <div className="p-6 bg-gradient-to-r from-[#201115] to-[#080d19] border border-rose-500/20 rounded-xl relative overflow-hidden">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 opacity-5 pointer-events-none">
                      <Heart className="h-48 w-48 text-rose-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-200">Critical Medical Infrastructure Monitor</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      Welcome, {user.name}. As a Hospital Admin, you have read-only monitoring access to vaccine cooling nodes, active ICU power telemetry grids, and oxygen valve diagnostic systems. (Write actions are restricted to system engineers).
                    </p>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#080d19] border border-[#1e293b] p-5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">CRITICAL MEDICAL NODES</span>
                        <h3 className="text-2xl font-bold text-rose-500 mt-1">
                          {nodes.filter(n => n.name.includes('ICU') || n.name.includes('Vaccine')).length} Active
                        </h3>
                      </div>
                      <Heart className="h-8 w-8 text-rose-500/30" />
                    </div>

                    <div className="bg-[#080d19] border border-[#1e293b] p-5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">INFRASTRUCTURE STATUS</span>
                        <h3 className="text-2xl font-bold text-emerald-400 mt-1">SECURED</h3>
                      </div>
                      <CheckCircle className="h-8 w-8 text-emerald-500/30" />
                    </div>

                    <div className="bg-[#080d19] border border-[#1e293b] p-5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">ALERTS RECORDED</span>
                        <h3 className="text-2xl font-bold text-slate-300 mt-1">
                          {alerts.filter(a => a.nodeId.includes('node-h')).length} Unresolved
                        </h3>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-slate-500/30" />
                    </div>
                  </div>
                </div>
              )}

              {/* REGULAR OVERVIEW SUMMARY LISTS (SHARED) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual hardware grid preview */}
                <div className="bg-[#080d19] border border-[#1e293b] p-6 rounded-xl lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                    <h4 className="font-semibold text-slate-200">Active System Telemetry Map</h4>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Node Telemetry Feed</span>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {nodes.slice(0, 5).map(node => (
                      <div key={node.id} className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${node.status === 'ONLINE' ? 'bg-emerald-500' : node.status === 'WARNING' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                          <span className="font-mono text-slate-200 font-medium">{node.name}</span>
                          <span className="text-slate-500 text-[10px] font-mono">{node.ipAddress}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                          <span>CPU: {node.cpuUsage}%</span>
                          <span>RAM: {node.ramUsage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-center pt-2">
                    <button 
                      onClick={() => setActiveTab('nodes')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium hover:underline inline-flex items-center gap-1"
                    >
                      Browse full cluster inventory &rarr;
                    </button>
                  </div>
                </div>

                {/* Unresolved Incidents */}
                <div className="bg-[#080d19] border border-[#1e293b] p-6 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-[#1e293b] pb-3 mb-4">
                      <h4 className="font-semibold text-slate-200">Urgent Incidents</h4>
                      <span className="text-xs text-red-400 font-mono font-bold">{unresolvedAlerts.length} Active</span>
                    </div>

                    <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                      {unresolvedAlerts.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto opacity-40 mb-2" />
                          <p className="text-xs">No active anomalies detected.</p>
                        </div>
                      ) : (
                        unresolvedAlerts.slice(0, 3).map(alert => (
                          <div 
                            key={alert.id} 
                            className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                              alert.severity === 'CRITICAL' ? 'bg-red-950/20 border-red-900/40' : 'bg-amber-950/20 border-amber-900/40'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold uppercase tracking-wider text-rose-300">{alert.severity}</span>
                              <span className="text-slate-500 font-mono">{new Date(alert.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed">{alert.message}</p>
                            
                            {/* RBAC: Only allow Operators and Police to resolve */}
                            {(user.role === 'NODE_OPERATOR' || user.role === 'POLICE') && (
                              <div className="flex justify-end pt-1">
                                <button 
                                  onClick={() => handleResolveAlert(alert.id)}
                                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 font-mono hover:underline"
                                >
                                  MARK RESOLVED
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="text-center pt-4 border-t border-[#1e293b] mt-4">
                    <button 
                      onClick={() => setActiveTab('alerts')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium hover:underline inline-flex items-center gap-1"
                    >
                      View incident supervisor logs &rarr;
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: NODES MANAGEMENT PAGE */}
          {activeTab === 'nodes' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#080d19] border border-[#1e293b] p-4 rounded-xl">
                
                {/* Search */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Search node identifier..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-[#0d1326] border border-[#1e293b] rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/70 transition-all w-60"
                    />
                  </div>

                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#0d1326] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/70 transition-all font-sans"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ONLINE">Online</option>
                    <option value="WARNING">Warning</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </div>

                {/* RBAC: Only allow Node Operator to register node */}
                {user.role === 'NODE_OPERATOR' ? (
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  >
                    <Plus className="h-4 w-4" />
                    Register Server
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono border border-slate-800 px-3 py-2 rounded-lg bg-slate-900/20">
                    🔒 Node registration locked (Operator Privileges Required)
                  </span>
                )}
              </div>

              {/* GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredNodes.length === 0 ? (
                  <div className="col-span-full bg-[#080d19] border border-[#1e293b] text-center p-16 rounded-xl">
                    <Server className="h-12 w-12 text-slate-700 mx-auto opacity-50 mb-3" />
                    <h4 className="font-semibold text-slate-300">No nodes matching requirements found</h4>
                  </div>
                ) : (
                  filteredNodes.map(node => (
                    <div 
                      key={node.id} 
                      className="bg-[#080d19] border border-[#1e293b] rounded-xl overflow-hidden hover:border-slate-700 transition-all duration-300 group shadow-md"
                    >
                      <div className="p-5 border-b border-[#1e293b]/70 flex items-center justify-between bg-slate-950/20">
                        <div>
                          <h4 className="font-semibold text-slate-200 font-mono">{node.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">{node.ipAddress}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono ${
                          node.status === 'ONLINE' ? 'bg-emerald-950/50 border border-emerald-900/50 text-emerald-400' :
                          node.status === 'WARNING' ? 'bg-amber-950/50 border border-amber-900/50 text-amber-400' :
                          'bg-rose-950/50 border border-rose-900/50 text-rose-400'
                        }`}>
                          {node.status}
                        </span>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* CPU */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">CPU Usage</span>
                            <span className="font-mono text-slate-300">{node.cpuUsage}%</span>
                          </div>
                          <div className="w-full bg-slate-900/80 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                node.cpuUsage > 85 ? 'bg-red-500' : node.cpuUsage > 60 ? 'bg-amber-500' : 'bg-cyan-500'
                              }`} 
                              style={{ width: `${node.cpuUsage}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* RAM */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">RAM Usage</span>
                            <span className="font-mono text-slate-300">{node.ramUsage}%</span>
                          </div>
                          <div className="w-full bg-slate-900/80 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                node.ramUsage > 90 ? 'bg-red-500' : node.ramUsage > 70 ? 'bg-amber-500' : 'bg-indigo-500'
                              }`} 
                              style={{ width: `${node.ramUsage}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Storage */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Disk Storage</span>
                            <span className="font-mono text-slate-300">{node.storageUsage}%</span>
                          </div>
                          <div className="w-full bg-slate-900/80 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                node.storageUsage > 85 ? 'bg-red-500' : 'bg-slate-400'
                              }`} 
                              style={{ width: `${node.storageUsage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950/40 border-t border-[#1e293b]/70 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Wifi className="h-3 w-3" />
                          Ping Status
                        </span>
                        <span>{new Date(node.lastPing).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 3: ALERTS LOG PAGE */}
          {activeTab === 'alerts' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="bg-[#080d19] border border-[#1e293b] p-6 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-[#1e293b] pb-4">
                  <div>
                    <h3 className="font-semibold text-slate-200">Incident Registry & Safety Override console</h3>
                    <p className="text-xs text-slate-500">Security event dispatcher log records.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-[#1e293b] text-slate-400 font-mono bg-slate-950/20 uppercase">
                        <th className="py-3 px-4">Severity</th>
                        <th className="py-3 px-4">Monitored Target</th>
                        <th className="py-3 px-4">Anomaly Message</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Access Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]/50">
                      {alerts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500">
                            No logs recorded. System core is operational.
                          </td>
                        </tr>
                      ) : (
                        alerts.map(alert => (
                          <tr key={alert.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] uppercase tracking-wider ${
                                alert.severity === 'CRITICAL' ? 'bg-red-950 border border-red-800 text-red-400' :
                                alert.severity === 'WARNING' ? 'bg-amber-950 border border-amber-800 text-amber-400' :
                                'bg-slate-800 border border-slate-700 text-slate-300'
                              }`}>
                                {alert.severity}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-200 font-medium">
                              {alert.node?.name || `node-${alert.nodeId.substring(0, 5)}`}
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 max-w-sm truncate" title={alert.message}>
                              {alert.message}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-400">
                              {new Date(alert.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              {alert.resolved ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Resolved
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-500 font-semibold animate-pulse">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {!alert.resolved && (user.role === 'NODE_OPERATOR' || user.role === 'POLICE') ? (
                                <button 
                                  onClick={() => handleResolveAlert(alert.id)}
                                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold font-mono hover:underline"
                                >
                                  RESOLVE
                                </button>
                              ) : !alert.resolved ? (
                                <span className="text-[10px] text-slate-600 font-mono">🔒 LOCKED</span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono">CLOSED</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* REGISTER NODE DIALOG MODAL (NODE_OPERATOR only) */}
      {isModalOpen && user.role === 'NODE_OPERATOR' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#080d19] border border-[#1e293b] rounded-xl w-full max-w-md overflow-hidden animate-zoomIn shadow-2xl">
            <div className="p-6 border-b border-[#1e293b] flex items-center justify-between">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <Server className="h-5 w-5 text-cyan-400" />
                Initialize Cluster Node Registry
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); resetNodeForm(); }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNode} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono uppercase">Node Identifier Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. ICU-Generator-Secondary"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  className="w-full bg-[#0d1326] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/70"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono uppercase">Network IP Address</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 192.168.4.15"
                  value={newNodeIp}
                  onChange={(e) => setNewNodeIp(e.target.value)}
                  className="w-full bg-[#0d1326] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/70"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono uppercase">Initial Core Daemon Status</label>
                <select 
                  value={newNodeStatus}
                  onChange={(e) => setNewNodeStatus(e.target.value)}
                  className="w-full bg-[#0d1326] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/70"
                >
                  <option value="ONLINE">Online (Daemon Active)</option>
                  <option value="WARNING">Warning (High load flags)</option>
                  <option value="OFFLINE">Offline (Inactive daemon)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#1e293b] mt-6">
                <button 
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetNodeForm(); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold"
                >
                  Register Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
