import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck, Mail, Bell,
  Calendar, BookOpen, Smartphone, FileSpreadsheet, Lock, Flame, Send, RefreshCw, Check, Eye, FileText,
  School, Sun, Moon, Info, Activity, HeartPulse,
  UserPlus, LogIn, LogOut
} from 'lucide-react';

import Management from './Management';
import Account from './Account';
import FamilyPortal from './FamilyPortal';
import Notifications from './Notifications';
import SchoolRecovery from './SchoolRecovery';
import Guide from './Guide';
import DailyAttendance from './DailyAttendance';
import {createEmergencySound} from './emergencySound';

export default function App({deployment}) {
  const schoolMode=deployment?.mode==='school';
  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('eyoklama_theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('eyoklama_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  // Auth & Session State
  const [token, setToken] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ usernameOrEmail: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Main navigation tab
  const [activeTab, setActiveTab] = useState('attendance'); 
  // attendance | queue | matrix | eokul | students | users | homework | announcements | devices | outbox | logs

  // Context & Operational States
  const [turkeyTime, setTurkeyTime] = useState({ full: '', time: '', date: '', dayOfWeek: 1 });
  const [periods, setPeriods] = useState([]);
  const [allowedClasses, setAllowedClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [lessonNote, setLessonNote] = useState('');
  const [queue, setQueue] = useState([]);
  const [matrixData, setMatrixData] = useState({ sessions: [], matrix: [] });
  const [usersList, setUsersList] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [devices, setDevices] = useState([]);
  const [sentNotifications, setSentNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const activeEmergencyRef = useRef(null);
  activeEmergencyRef.current = activeEmergency;
  const [healthData, setHealthData] = useState(null);
  const emergencyAudio = useRef(null);
  if (!emergencyAudio.current) emergencyAudio.current = createEmergencySound();
  const emergencyRequest = useRef(0);
  const emergencyPreviewSequence = useRef(0);
  const [emergencySoundState, setEmergencySoundState] = useState('idle');
  const [emergencyBusy, setEmergencyBusy] = useState(false);
  const [emergencyPreviewMessage, setEmergencyPreviewMessage] = useState('');
  const [guideBeforeLogin, setGuideBeforeLogin] = useState(false);

  const [importKind,setImportKind] = useState('students');
  const [authLoading, setAuthLoading] = useState(true);
  const [attendanceVersion, setAttendanceVersion] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const studentRequest = useRef(0);

  // Modals
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencySchool,setEmergencySchool] = useState('');
  const [emergencyType, setEmergencyType] = useState('YANGIN');
  const [emergencyMessage, setEmergencyMessage] = useState('Kurumun acil durum planına ve yetkililerin yönlendirmelerine uyun.');
  const [universalRevealStudent, setUniversalRevealStudent] = useState(null);
  const [revealPassword, setRevealPassword] = useState('');
  const [revealReason, setRevealReason] = useState('Resmi MEB İncelemesi / Veli Görüşmesi');
  const [revealedResult, setRevealedResult] = useState(null);
  const [newUserModal, setNewUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    role: 'admin',
    full_name: '',
    username: '',
    email: '',
    password: '',
    title: '',
    phone: '',
    school_id: 2
  });
  const [newHwModal, setNewHwModal] = useState(false);
  const [hwForm, setHwForm] = useState({ title: '', subject: 'Matematik', classId: 1, dueDate: '', description: '' });
  const [newAnnModal, setNewAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', content: '', priority: 'NORMAL', targetType: 'CLASS', targetClassId: '' });
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const apiFetch = useCallback(async (url, options = {}) => {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 30000);
    try {
      const headers = new Headers(options.headers || {});
      let fingerprint = localStorage.getItem('dersteyim_device');
      if (!fingerprint) { fingerprint = crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,'0')).join(''); localStorage.setItem('dersteyim_device', fingerprint); }
      headers.set('X-Device-Fingerprint', fingerprint);
      const response = await fetch(url, {...options, headers, credentials: 'same-origin', signal: options.signal || controller.signal});
      if (!response.ok) {
        const data = await response.clone().json().catch(() => ({message: 'Sunucu yanıtı okunamadı.'}));
        if (response.status === 401 && !url.includes('/auth/login')) { setCurrentUser(null); setToken(''); }
        if (!url.includes('/auth/me')) setStatusMessage(data.message || 'İşlem tamamlanamadı.');
      }
      return response;
    } catch (error) { setStatusMessage('Sunucuya ulaşılamadı. Sunucu penceresini ve bağlantınızı kontrol edin.'); throw error; } finally { clearTimeout(deadline); }
  }, []);
  const refreshSession = useCallback(async () => {
    const r = await apiFetch('/api/auth/me'); const d = await r.json();
    if (d.success) setCurrentUser(d.user);
  }, [apiFetch]);
  useEffect(() => {
    localStorage.removeItem('eyoklama_token');
    Promise.resolve().then(refreshSession).catch(() => {}).finally(() => setAuthLoading(false));
  }, [refreshSession]);

  // Fetch context and schedule
  const fetchContext = useCallback(async () => {
    if (!currentUser) return;
    try {
      const url = '/api/attendance/current-context';

      const res = await apiFetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setTurkeyTime(data.turkeyTime);
        setPeriods(data.periods);
        setAllowedClasses(data.allowedClasses);
        setAllClasses(data.allClasses);
        if (!data.allClasses.length) {setStudents([]);setAttendanceRecords({});setAttendanceVersion(null);setMatrixData({sessions:[],matrix:[]});}
        const preferred=data.allClasses.find(c=>c.academic_year===data.academicYear)?.id||data.allClasses[0]?.id||'';
        setSelectedClassId(previous => data.allClasses.some(c => c.id === Number(previous)) ? previous : preferred);
        setHwForm(previous => ({...previous, classId: data.allClasses.some(c => c.id === Number(previous.classId)) ? previous.classId : preferred}));
        setAttendanceDate(previous => previous || data.turkeyTime.date);

        if (currentUser.role === 'teacher') {
          if (data.allowedClasses && data.allowedClasses.length > 0) {
            setSelectedClassId(data.allowedClasses[0].class_id);
            setSelectedPeriod(data.allowedClasses[0].period);
          }
        }
      }
    } catch (err) {
      console.error('Fetch context error:', err);
    }
  }, [currentUser, apiFetch, token]);

  // Fetch Class Students
  const fetchClassStudents = useCallback(async (cId, pNum) => {
    if (!currentUser || currentUser.must_change_password || !cId) return;
    const sequence = ++studentRequest.current; setListLoading(true);
    try {
      const res = await apiFetch(`/api/attendance/class-students/${cId || selectedClassId}?period=${pNum || selectedPeriod}${attendanceDate ? `&date=${attendanceDate}` : ''}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (sequence !== studentRequest.current) return;
      if (!data.success) { setStudents([]); setAttendanceVersion(null); }
      if (data.success) {
        setAttendanceVersion(data.existingSession?.saved_timestamp ?? null);
        setStudents(data.students);
        const initial = {};
        data.students.forEach(s => {
          initial[s.id] = data.existingRecords[s.id] || 'GELDI';
        });
        setAttendanceRecords(initial);
        setLessonNote(data.existingSession?.note || '');
      }
    } catch (err) {
      console.error('Fetch students error:', err);
    } finally { if (sequence === studentRequest.current) setListLoading(false); }
  }, [currentUser, apiFetch, token, selectedClassId, selectedPeriod, attendanceDate]);

  // Fetch Notification Queue
  const fetchQueue = useCallback(async () => {
    try {
      const res = await apiFetch('/api/attendance/queue', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) setQueue(data.queue);
    } catch (err) {
      console.error('Fetch queue error:', err);
    }
  }, [apiFetch, token]);

  // Fetch Emergency
  const fetchEmergencyStatus = useCallback(async () => {
    const sequence = ++emergencyRequest.current;
    try {
      const res = await apiFetch(`/api/emergency/active${emergencySchool ? `?schoolId=${emergencySchool}` : ''}`);
      const data = await res.json();
      if (data.success && sequence === emergencyRequest.current) setActiveEmergency(data.activeAlert);
    } catch (err) {
      console.error('Fetch emergency error:', err);
    }
  }, [apiFetch, emergencySchool]);

  // Fetch Health
  const fetchHealthInfo = useCallback(async () => {
    try {
      const res = await apiFetch('/api/health');
      const data = await res.json();
      if (res.ok) setHealthData(data);
    } catch (err) {
      console.error('Fetch health error:', err);
    }
  }, [apiFetch]);

  // Fetch Matrix
  const fetchMatrix = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/attendance/history?classId=${selectedClassId}${attendanceDate ? `&date=${attendanceDate}` : ''}`);
      const data = await res.json();
      if (data.success) setMatrixData(data);
    } catch (err) {
      console.error('Fetch matrix error:', err);
    }
  }, [apiFetch, selectedClassId, attendanceDate]);

  // Fetch Users & Schools
  const fetchUsersAndSchools = useCallback(async () => {
    try {
      const [uRes, sRes] = await Promise.all([
        apiFetch('/api/users', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }),
        apiFetch('/api/schools')
      ]);
      const uData = await uRes.json();
      const sData = await sRes.json();
      if (uData.success) setUsersList(uData.users);
      if (sData.success) setSchools(sData.schools);
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  }, [apiFetch, token]);

  // Fetch Aux Data
  const fetchAuxData = useCallback(async () => {
    try {
      if (activeTab === 'users' && ['superadmin','admin'].includes(currentUser.role)) fetchUsersAndSchools();
      else if (activeTab === 'homework') {
        const res = await apiFetch('/api/homework');
        const data = await res.json();
        if (data.success) setHomeworks(data.homeworks);
      } else if (activeTab === 'announcements') {
        const res = await apiFetch('/api/announcements');
        const data = await res.json();
        if (data.success) setAnnouncements(data.announcements);
      } else if (activeTab === 'devices') {
        const res = await apiFetch('/api/devices');
        const data = await res.json();
        if (data.success) setDevices(data.devices);
      } else if (activeTab === 'outbox' && ['superadmin','admin'].includes(currentUser.role)) {
        const res = await apiFetch('/api/notifications/sent');
        const data = await res.json();
        if (data.success) setSentNotifications(data.notifications);
      } else if (activeTab === 'logs') {
        const res = await apiFetch('/api/audit-logs');
        const data = await res.json();
        if (data.success) setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error('Aux data error:', err);
    }
  }, [activeTab, currentUser, apiFetch, fetchUsersAndSchools]);

  useEffect(() => {
    if (currentUser && !currentUser.must_change_password) {
      void Promise.resolve().then(() => {fetchContext();fetchEmergencyStatus();fetchHealthInfo();});
      const interval = setInterval(() => {
        fetchEmergencyStatus();
        if (!['parent','student'].includes(currentUser.role)) fetchQueue();
      }, 10000);
      const clock = setInterval(fetchContext, 30000);
      return () => { clearInterval(interval); clearInterval(clock); };
    }
  }, [currentUser, fetchContext, fetchEmergencyStatus, fetchHealthInfo, fetchQueue]);

  useEffect(() => {
    if (!currentUser || currentUser.must_change_password || ['parent', 'student'].includes(currentUser.role) || !activeEmergency) {
      emergencyAudio.current.stop();
      setEmergencySoundState('idle');
      return;
    }
    setEmergencySoundState(emergencyAudio.current.start(activeEmergency.alert_type) ? 'playing' : 'blocked');
    return () => emergencyAudio.current.stop();
  }, [currentUser?.id, currentUser?.role, currentUser?.must_change_password, activeEmergency?.id, activeEmergency?.alert_type]);

  useEffect(() => () => emergencyAudio.current.dispose(), []);

  useEffect(() => {
    if (currentUser && !currentUser.must_change_password && !['parent','student'].includes(currentUser.role) && selectedClassId) {
      void Promise.resolve().then(() => fetchClassStudents(selectedClassId, selectedPeriod));
    }
  }, [selectedClassId, selectedPeriod, attendanceDate, currentUser, fetchClassStudents]);

  useEffect(() => {
    if (!currentUser || currentUser.must_change_password || ['parent','student'].includes(currentUser.role)) return;
    void Promise.resolve().then(() => {
    fetchAuxData();
    if (activeTab === 'queue') fetchQueue();
    if (activeTab === 'matrix' && selectedClassId) fetchMatrix();
    if (['attendance','students'].includes(activeTab)) fetchClassStudents(selectedClassId, selectedPeriod);
    });
  }, [activeTab, selectedClassId, attendanceDate, selectedPeriod, currentUser, fetchAuxData, fetchQueue, fetchMatrix, fetchClassStudents]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: loginForm.usernameOrEmail,
          password: loginForm.password
        })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        
        setCurrentUser(data.user);
        setLoginForm({usernameOrEmail:'',password:''});
        showMessage(`Hoş geldiniz, ${data.user.full_name}!`);
      } else {
        setLoginError(data.message || 'Giriş başarısız!');
      }
    } catch {
      setLoginError('Sunucu bağlantı hatası!');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try { const registration=await navigator.serviceWorker?.getRegistration(); const subscription=await registration?.pushManager.getSubscription(); if(subscription){await apiFetch('/api/push/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})});await subscription.unsubscribe();} } catch {}
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch {}
    studentRequest.current++;
    emergencyRequest.current++;
    emergencyPreviewSequence.current++;
    emergencyAudio.current.stop();
    setActiveEmergency(null);
    setToken('');
    setCurrentUser(null);
    setActiveTab('attendance'); setStudents([]); setQueue([]); setSelectedClassId('');
    localStorage.removeItem('eyoklama_token');
    showMessage('Oturum kapatıldı.');
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    if (saving || listLoading) return; setSaving(true);
    try {
      const res = await apiFetch('/api/attendance/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          classId: selectedClassId,
          period: selectedPeriod,
          teacherId: currentUser.id,
          records: attendanceRecords,
          note: lessonNote,
          date: attendanceDate || undefined,
          expectedSavedTimestamp: attendanceVersion
        })
      });
      const data = await res.json();
      if (data.success) {
        showMessage(`✅ ${data.message} (Kayıt Saati: ${data.savedAt})`);
        setAttendanceVersion(data.saved_timestamp);
        fetchQueue();
        if (activeTab === 'matrix') fetchMatrix();
      }
    } catch {
      showMessage('Yoklama kaydedilemedi.');
    } finally { setSaving(false); }
  };

  // Set All Present
  const handleMarkAllPresent = () => {
    const updated = {};
    students.forEach(s => { updated[s.id] = 'GELDI'; });
    setAttendanceRecords(updated);
  };

  const setStudentStatus = (studentId, status) => {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: status }));
  };

  // Send Immediately from Queue
  const handleSendQueueNow = async (queueId) => {
    try {
      const res = await apiFetch(`/api/attendance/queue/${queueId}/send-now`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showMessage(data.message);
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cancel Queue item
  const handleCancelQueue = async (queueId) => {
    try {
      const res = await apiFetch(`/api/attendance/queue/${queueId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Öğrenci sınıfa sonradan katıldı' })
      });
      const data = await res.json();
      if (data.success) {
        showMessage('Bekleyen bildirim iptal edildi.');
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Emergency SOS
  const handleTriggerEmergency = async () => {
    if (emergencyBusy) return;
    setEmergencyBusy(true);
    emergencyPreviewSequence.current++;
    if (!activeEmergency) emergencyAudio.current.stop();
    // Prepare audio during the click, but do not play until the server confirms the alarm.
    const audioReady = emergencyAudio.current.unlock();
    try {
      const res = await apiFetch('/api/emergency/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          triggeredById: currentUser.id,
          alertType: emergencyType,
          schoolId: emergencySchool || currentUser.school_id,
          message: emergencyMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        setEmergencyModalOpen(false);
        await Promise.race([audioReady, new Promise(resolve => setTimeout(resolve, 1000))]);
        emergencyRequest.current++;
        if (data.activeAlert) setActiveEmergency(data.activeAlert);
        else await fetchEmergencyStatus();
        showMessage(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEmergencyBusy(false);
    }
  };

  const handleEmergencyPreview = async () => {
    if (activeEmergency) return;
    const sequence = ++emergencyPreviewSequence.current;
    const ready = await emergencyAudio.current.unlock();
    if (sequence !== emergencyPreviewSequence.current || activeEmergencyRef.current) return;
    const playing = ready && emergencyAudio.current.start(emergencyType, {preview: true});
    setEmergencyPreviewMessage(playing ? 'Örnek ses kısa süreyle çalar; alarm kaydı oluşturulmaz.' : 'Ses başlatılamadı. Windows ses çıkışını ve hoparlörleri kontrol edin.');
  };

  const handleEnableEmergencySound = async () => {
    const alertId = activeEmergency.id;
    const ready = await emergencyAudio.current.unlock();
    if (activeEmergencyRef.current?.id !== alertId) return;
    setEmergencySoundState(ready && emergencyAudio.current.start(activeEmergency.alert_type) ? 'playing' : 'blocked');
  };

  const handleResolveEmergency = async () => {
    try {
      const res = await apiFetch('/api/emergency/resolve', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({schoolId:emergencySchool||currentUser.school_id})
      });
      const data = await res.json();
      if (data.success) {
        emergencyRequest.current++;
        emergencyAudio.current.stop();
        setActiveEmergency(null);
        showMessage('Acil durum alarmı sonlandırıldı.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Universal KVKK Reveal with Immutable Audit Log
  const handleUniversalReveal = async () => {
    if (!universalRevealStudent) return;
    try {
      const res = await apiFetch('/api/kvkk/reveal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: universalRevealStudent.id,
          adminPassword: revealPassword,
          reason: revealReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setRevealedResult(data.revealedData);
        showMessage('KVKK Denetim Defteri Güncellendi: Tüm kişisel bilgiler çözümlendi.');
      } else {
        alert(data.message || 'Yetkisiz işlem! Şifrenizi kontrol ediniz.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create User (Superadmin / School Admin)
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          creatorId: currentUser.id,
          ...newUserForm
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewUserModal(false);
        showMessage(`🎉 ${data.message}`);
        fetchUsersAndSchools();
        setNewUserForm({
          role: 'admin',
          full_name: '',
          username: '',
          email: '',
          password: '',
          title: '',
          phone: '',
          school_id: 2
        });
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const downloadFile = async (url, filename) => {
    const r = await apiFetch(url); if (!r.ok) return;
    const blob = await r.blob(), href = URL.createObjectURL(blob);
    const disposition=r.headers.get('Content-Disposition')||'';
    const encoded=/filename\*=UTF-8''([^;]+)/i.exec(disposition),plain=/filename="?([^";]+)"?/i.exec(disposition);
    let suggested=filename;try{suggested=encoded?decodeURIComponent(encoded[1]):plain?.[1]||filename;}catch{}
    const a = document.createElement('a'); a.href = href; a.download = suggested; a.click(); URL.revokeObjectURL(href);
  };
  const handleImport = async (e) => {
    const file = e.target.files?.[0]; if (!file || !selectedClassId) return;
    if (file.size > 5 * 1024 * 1024) { showMessage('Dosya en fazla 5 MB olabilir.'); return; }
    try {
      const r = await apiFetch(`/api/e-okul/import?classId=${selectedClassId}&kind=${importKind}${attendanceDate ? `&date=${attendanceDate}` : ''}`, {method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file});
      const d = await r.json(); showMessage(d.message); if(d.success) fetchClassStudents(selectedClassId, selectedPeriod);
    } catch {} finally { e.target.value = ''; }
  };

  // Create Homework
  const handleCreateHomework = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/homework', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teacherId: currentUser.id,
          classId: hwForm.classId,
          subject: hwForm.subject,
          title: hwForm.title,
          description: hwForm.description,
          dueDate: hwForm.dueDate
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewHwModal(false);
        showMessage('Ödev başarıyla tanımlandı.');
        fetchAuxData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Announcement
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          createdById: currentUser.id,
          title: annForm.title,
          content: annForm.content,
          priority: annForm.priority,
          targetType: annForm.targetType,
          targetClassId: annForm.targetClassId
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewAnnModal(false);
        showMessage('Duyuru yayınlandı.');
        fetchAuxData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const showMessage = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const isTeacherRestricted = currentUser?.role === 'teacher';
  const hasActiveScheduledClass = allowedClasses && allowedClasses.length > 0;
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAnyAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  if (authLoading) return <div role="status" className="min-h-screen grid place-items-center">VarYok yükleniyor…</div>;
  if (currentUser?.must_change_password) return <Account request={apiFetch} user={currentUser} forced onChanged={refreshSession} onLogout={handleLogout}/>;
  if (currentUser && ['parent','student'].includes(currentUser.role)) return <FamilyPortal user={currentUser} request={apiFetch} onLogout={handleLogout}/>;
  if (!currentUser && guideBeforeLogin) return <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4"><div className="max-w-4xl mx-auto"><button className="action mb-4" onClick={() => setGuideBeforeLogin(false)}>Girişe dön</button><Guide/></div></main>;
  // LOGIN SCREEN (If not authenticated)
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 px-4 py-12 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="text-center mb-6">
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 inline-block mb-3">
              <img src="/varyok-logo.png" alt="VarYok" className="h-16 w-auto object-contain mx-auto" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Var<span className="text-cyan-600 dark:text-cyan-400">Yok</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Niğde İl Millî Eğitim Müdürlüğü • YEĞİTEK Birimi
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <p className="text-sm text-slate-500 mb-4">Bu bilgisayarda oluşturduğunuz kullanıcı adı ve şifreyle giriş yapın.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-user" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kullanıcı Adı veya E-Posta
              </label>
              <input
                id="login-user" type="text"
                required
                value={loginForm.usernameOrEmail}
                onChange={(e) => setLoginForm({ ...loginForm, usernameOrEmail: e.target.value })}
                placeholder="Kullanıcı adınız veya e-posta adresiniz" autoComplete="username"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Şifre
              </label>
              <input
                id="login-password" type="password"
                autoComplete="current-password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••••••"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition active:scale-95 text-sm flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loginLoading ? 'Doğrulanıyor...' : 'Giriş Yap'}</span>
            </button>
          </form>
          {schoolMode&&<SchoolRecovery/>}
          <button type="button" className="underline text-sm mt-3" onClick={() => setGuideBeforeLogin(true)}>Kullanım kılavuzu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. EMERGENCY ACTIVE BANNER */}
      {activeEmergency && (
        <div className="bg-red-600 text-white px-4 py-3 shadow-lg flex flex-wrap items-center justify-between animate-pulse sticky top-0 z-50">
          <div className="flex items-center space-x-3">
            <Flame className="w-7 h-7 text-yellow-300 animate-bounce" />
            <div>
              <span className="font-extrabold text-lg uppercase tracking-wider bg-red-800 px-2.5 py-1 rounded">
                🚨 {activeEmergency.alert_type} ALARMI
              </span>
              <span className="ml-3 font-semibold text-white text-base">
                {activeEmergency.message}
              </span>
              <span className="ml-2 text-xs text-red-200">
                (Saat: {activeEmergency.triggered_at})
              </span>
              <p className="mt-1 text-xs">{emergencySoundState === 'playing' ? 'Alarm sesi bu bilgisayarda etkin.' : 'Alarm sesi henüz açılamadı; sesi etkinleştirin ve hoparlörleri kontrol edin.'}</p>
            </div>
          </div>
          {emergencySoundState === 'blocked' && <button type="button" onClick={handleEnableEmergencySound} className="mt-2 sm:mt-0 bg-white text-red-700 font-bold px-4 py-1.5 rounded-lg text-sm">Sesi etkinleştir</button>}
          {isAnyAdmin && (
            <button
              onClick={handleResolveEmergency}
              className="mt-2 sm:mt-0 bg-white text-red-700 hover:bg-red-50 font-bold px-4 py-1.5 rounded-lg text-sm shadow transition"
            >
              Alarmı Kapat / Normale Dön
            </button>
          )}
        </div>
      )}

      {/* 2. TOP HEADER */}
      <header className="bg-blue-900 dark:bg-slate-950 text-white shadow-md border-b border-blue-800 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & School Title & Niğde MEM YEĞİTEK Attribution */}
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-cyan-400/30 flex items-center justify-center">
              <img src="/varyok-square.png" alt="VarYok" className="w-9 h-9 object-contain rounded-xl" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black tracking-tight text-white flex items-center">
                  <span>Var</span><span className="text-cyan-400">Yok</span>
                </h1>
                <span className="bg-emerald-500 text-emerald-950 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Veri maskeleme aktif
                </span>
                {currentUser.is_owner && (
                  <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">
                    Ana Yetkili (Yazar)
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200 dark:text-blue-300 font-medium">
                T.C. MEB • <strong>Niğde İl Millî Eğitim Müdürlüğü YEĞİTEK Birimi</strong> • {currentUser.school_name || 'Merkez'}
              </p>
            </div>
          </div>

          {/* Theme, Time & User Profile */}
          <div className="flex items-center space-x-3">
            
            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-blue-800 dark:bg-slate-800 hover:bg-blue-700 dark:hover:bg-slate-700 text-yellow-300 transition border border-blue-700 dark:border-slate-700 shadow-sm"
              title={theme === 'dark' ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
              aria-label="Tema Değiştir"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-blue-200" />}
            </button>

            {/* Health & License Modal */}
            <button
              onClick={() => { setLicenseModalOpen(true); fetchHealthInfo(); }}
              className="p-2 rounded-xl bg-blue-800 dark:bg-slate-800 hover:bg-blue-700 dark:hover:bg-slate-700 text-blue-200 transition border border-blue-700 dark:border-slate-700 shadow-sm flex items-center space-x-1"
              title="Lisans ve Sistem Durumu"
            >
              <HeartPulse className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Turkey Time */}
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-[11px] text-blue-300 font-mono flex items-center justify-end space-x-1">
                <Clock className="w-3 h-3 mr-1" /> Türkiye Saati (UTC+3)
              </span>
              <span className="text-xs font-bold text-white font-mono">
                {turkeyTime.full || 'Yükleniyor...'}
              </span>
            </div>

            {/* Emergency SOS Button for Admin */}
            {isAnyAdmin && (
              <button
                onClick={async () => {const d=await(await apiFetch('/api/schools')).json();setSchools(d.schools||[]);setEmergencySchool(emergencySchool||currentUser.school_id);setEmergencyModalOpen(true);}}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow flex items-center space-x-1.5 transition active:scale-95"
              >
                <Flame className="w-4 h-4 text-yellow-300 animate-pulse" />
                <span>ACİL DURUM</span>
              </button>
            )}

            {/* User Profile & Logout */}
            <div className="flex items-center space-x-2 bg-blue-800/80 dark:bg-slate-800 p-1.5 rounded-2xl border border-blue-700 dark:border-slate-700">
              <div className="text-left pl-1">
                <span className="text-xs font-bold text-white block leading-tight">
                  {currentUser.full_name}
                </span>
                <span className="text-[10px] text-blue-200 dark:text-blue-300 block leading-tight">
                  {currentUser.title || currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 hover:bg-red-600 rounded-xl text-red-200 hover:text-white transition"
                title="Çıkış Yap"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </header>

      {schoolMode&&<div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm text-center">{deployment.school.name} · Bu bilgisayarda çevrimdışı kullanım · E-posta ve push pasif</div>}
      {/* STATUS TOAST NOTIFICATION */}
      {statusMessage && (
        <div className="max-w-4xl mx-auto mt-3 px-4 w-full">
          <div role="status" className="bg-blue-600 dark:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between border border-blue-400">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-white hover:text-blue-200 font-bold ml-4">✕</button>
          </div>
        </div>
      )}

      {/* 4. MAIN NAVIGATION TABS */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 overflow-x-auto py-2 scrollbar-none text-sm font-medium">
          
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'attendance'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Yoklama Al</span>
          </button>

          {!schoolMode && (          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 whitespace-nowrap transition relative ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>30 Dk. Bildirim Kuyruğu</span>
            {queue.filter(q => q.status === 'PENDING').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-1">
                {queue.filter(q => q.status === 'PENDING').length}
              </span>
            )}
          </button>)}

          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'matrix'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Ders & Yoklama Matrisi</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'students'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>KVKK Öğrenci & Veli Paneli</span>
          </button>

          {isAnyAdmin && !schoolMode && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 whitespace-nowrap transition ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSuperAdmin ? '👑 İdareci & Yetki Yönetimi' : '👥 Öğretmen & Personel Tanımla'}</span>
            </button>
          )}

          {isAnyAdmin && (
          <button
            onClick={() => setActiveTab('eokul')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'eokul'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>e-Okul İçe Aktar</span>
          </button>
          )}

          <button
            onClick={() => setActiveTab('homework')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'homework'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Ödev Paneli</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'announcements'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Duyurular</span>
          </button>

          {isAnyAdmin && (
            <button
              onClick={() => setActiveTab('devices')}
              className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 whitespace-nowrap transition ${
                activeTab === 'devices'
                  ? 'bg-blue-600 text-white shadow font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Cihaz Eşleştirme</span>
            </button>
          )}

          {isAnyAdmin && !schoolMode && (
          <button
            onClick={() => setActiveTab('outbox')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'outbox'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Gönderilen Mailler</span>
          </button>
          )}

          {isAnyAdmin && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 whitespace-nowrap transition ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>KVKK Log Defteri</span>
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-4 pt-3 flex flex-wrap gap-4"><button className="underline text-sm" onClick={()=>setActiveTab('notifications')}>Bildirimler</button><button onClick={() => setActiveTab('account')} className="underline text-sm">Hesabım</button>{isAnyAdmin && <button onClick={() => setActiveTab('management')} className="underline text-sm">Okul / sınıf kurulumu</button>}{isAnyAdmin && schoolMode && <button onClick={() => setActiveTab('users')} className="underline text-sm">Ek kullanıcılar (isteğe bağlı)</button>}<button onClick={() => setActiveTab('guide')} className="underline text-sm">Kullanım kılavuzu</button></div>
      {/* 5. TAB CONTENTS */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">

        {activeTab === 'notifications' && <Notifications request={apiFetch} user={currentUser}/>}
        {activeTab === 'management' && isAnyAdmin && <Management request={apiFetch} user={currentUser} onRefresh={fetchContext} schoolMode={schoolMode}/>}
        {activeTab === 'account' && <Account request={apiFetch} user={currentUser} onChanged={refreshSession}/>}
        {activeTab === 'guide' && <Guide/>}
        {!allClasses.length && activeTab !== 'guide' && <p className="panel mb-4">{schoolMode && isAnyAdmin ? 'Henüz sınıf yok. Okul / sınıf kurulumu bölümünden sınıfları ve öğrencileri ekleyin. Ek kullanıcı veya ders programı zorunlu değildir.' : 'Henüz erişebildiğiniz sınıf yok. Okul / sınıf kurulumu bölümünden sınıf ve ders programı tanımlayın.'}</p>}
        {/* TAB 1: ATTENDANCE */}
        {activeTab === 'attendance' && schoolMode && isAnyAdmin && <DailyAttendance request={apiFetch} classes={allClasses} periods={periods} classId={selectedClassId} onClassChange={setSelectedClassId} date={attendanceDate} onDateChange={setAttendanceDate} today={turkeyTime.date} downloadFile={downloadFile}/>}
        {activeTab === 'attendance' && !(schoolMode && isAnyAdmin) && (
          <div className="space-y-6">
            
            {/* Teacher Schedule Lock Alert */}
            {isTeacherRestricted && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-2xl shadow-xs">
                <div className="flex items-start">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      Öğretmen Ders Programı Kısıtlaması Aktif
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                      Kural gereği öğretmen yalnızca kendi haftalık ders programında o an hangi ders saatindeyse o sınıfın yoklamasını alabilir.
                    </p>
                    {hasActiveScheduledClass ? (
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mt-2 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg inline-block border border-emerald-300 dark:border-emerald-800">
                        Şu Anki Dersiniz: {allowedClasses[0].class_name} - {allowedClasses[0].subject} ({allowedClasses[0].period_name})
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-red-800 dark:text-red-300 mt-2 bg-red-100 dark:bg-red-950/60 px-2.5 py-1 rounded-lg inline-block border border-red-300 dark:border-red-800">
                        Şu anki saat diliminde ({turkeyTime.time}) adınıza atanmış bir ders bulunmamaktadır.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Header Controls */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 transition-colors">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Sınıf / Şube
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(Number(e.target.value))}
                    disabled={isTeacherRestricted && hasActiveScheduledClass}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {(isTeacherRestricted && hasActiveScheduledClass ? allowedClasses : allClasses).map(c => (
                      <option key={c.id || c.class_id} value={c.id || c.class_id}>
                        {c.name || c.class_name} Sınıfı {c.academic_year && `(${c.academic_year})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Ders Saati
                  </label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                    disabled={isTeacherRestricted && hasActiveScheduledClass}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {periods.map(p => (
                      <option key={p.period} value={p.period}>
                        {p.name} ({p.start_time} - {p.end_time})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Tarih (Türkiye Saati)
                  </label>
                  <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <input aria-label="Yoklama tarihi" type="date" value={attendanceDate} max={turkeyTime.date || undefined} disabled={isTeacherRestricted} onChange={e=>setAttendanceDate(e.target.value)}/>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMarkAllPresent} disabled={listLoading || !students.length}
                className="bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Tümünü Geldi İşaretle</span>
              </button>
            </div>

            {listLoading && <p role="status">Öğrenci listesi yükleniyor…</p>}
            {/* Student List */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  Yoklama Listesi ({students.length} Öğrenci)
                </span>
                <div className="flex items-center space-x-3 text-xs font-semibold">
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Geldi: {Object.values(attendanceRecords).filter(v => v === 'GELDI').length}
                  </span>
                  <span className="text-red-700 dark:text-red-400">
                    Gelmedi: {Object.values(attendanceRecords).filter(v => v === 'GELMEDI').length}
                  </span>
                  <span className="text-amber-700 dark:text-amber-400">
                    Geç: {Object.values(attendanceRecords).filter(v => v === 'GEC').length}
                  </span>
                  <span className="text-blue-700 dark:text-blue-400">
                    İzinli: {Object.values(attendanceRecords).filter(v => v === 'IZINLI').length}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {students.map((student) => {
                  const currentStatus = attendanceRecords[student.id] || 'GELDI';
                  return (
                    <div
                      key={student.id}
                      className={`p-4 flex flex-wrap items-center justify-between gap-3 transition ${
                        currentStatus === 'GELMEDI'
                          ? 'bg-red-50/50 dark:bg-red-950/20'
                          : currentStatus === 'GEC'
                          ? 'bg-amber-50/40 dark:bg-amber-950/20'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-750'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs shadow-inner">
                          {student.student_no}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 dark:text-white text-base">
                              {student.masked_name}
                            </span>
                            <span className="text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg font-mono">
                              TC: {student.tc_masked}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Veli: <strong>{student.masked_parent_name}</strong> • İletişim: {student.masked_parent_phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setStudentStatus(student.id, 'GELDI')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                            currentStatus === 'GELDI'
                              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300 dark:ring-emerald-700'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Geldi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStudentStatus(student.id, 'GELMEDI')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                            currentStatus === 'GELMEDI'
                              ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-300 dark:ring-red-700'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Gelmedi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStudentStatus(student.id, 'GEC')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                            currentStatus === 'GEC'
                              ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300 dark:ring-amber-700'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Geç</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStudentStatus(student.id, 'IZINLI')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                            currentStatus === 'IZINLI'
                              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300 dark:ring-blue-700'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>İzinli</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ders Notu (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    value={lessonNote}
                    onChange={(e) => setLessonNote(e.target.value)}
                    placeholder="Dersin genel içeriği..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-100"
                  />
                  <p className="text-xs mt-1">Bu alana öğrenci adı, sağlık bilgisi veya devamsızlık gerekçesi yazmayın.</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Kayıt saati: <strong>{turkeyTime.time || '15:30'} (TSİ)</strong> • {schoolMode?'E-posta ve push kapalıdır; kayıt okul bilgisayarında saklanır.':'30 dakika gecikmeli bildirim kuyruğu devreye girer.'}
                  </span>

                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={saving || listLoading || !students.length || (isTeacherRestricted && !hasActiveScheduledClass)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-2xl shadow-md text-sm flex items-center space-x-2 transition active:scale-95"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>YOKLAMAYI KAYDET</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matrix' && selectedClassId && <div className="mb-4 flex flex-wrap gap-3"><input aria-label="Geçmiş yoklama tarihi" type="date" value={attendanceDate} onChange={e=>setAttendanceDate(e.target.value)}/><button className="action" onClick={()=>downloadFile(`/api/attendance/export?classId=${selectedClassId}&start=${attendanceDate}&end=${attendanceDate}`,'yoklama.xlsx')}>Excel olarak indir</button></div>}
        {/* TAB: KVKK ÖĞRENCİ VE VELİ PANELİ (UNIVERSAL REVEAL) */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 transition-colors">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Veri maskeleme aktif Öğrenci & Veli Veritabanı</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Hem öğrenci hem veli adları kesin 1-3 karakter kuralına göre maskelenir. Bilgilerin tamamı yalnızca gerekçeli ve <strong>erişim günlüğüne kaydedilerek</strong> olarak çözümlenebilir.
                </p>
              </div>

              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-200"
              >
                {allClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} Sınıfı ({c.academic_year})</option>
                ))}
              </select>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 overflow-x-auto transition-colors">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 w-16">No</th>
                    <th className="p-3">Öğrenci (Maskeli)</th>
                    <th className="p-3">T.C. Kimlik (Maskeli)</th>
                    <th className="p-3">Veli Adı (Maskeli)</th>
                    <th className="p-3">Veli Telefonu</th>
                    <th className="p-3">Veli E-Postası</th>
                    <th className="p-3 text-right">KVKK Denetimli Erişim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {students.map(st => (
                    <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750">
                      <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">{st.student_no}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{st.masked_name}</td>
                      <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400">{st.tc_masked}</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-semibold">{st.masked_parent_name}</td>
                      <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-400">{st.masked_parent_phone}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{st.masked_parent_email}</td>
                      <td className="p-3 text-right">
                        {isAnyAdmin ? (
                          <button
                            onClick={() => {
                              setUniversalRevealStudent(st);
                              setRevealedResult(null);
                              setRevealPassword('');
                            }}
                            className="bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center space-x-1 shadow-xs transition"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                            <span>Tümünü Gör (Loglu)</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Yetki Yok</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: USER & ROLE MANAGEMENT (DAĞITIM & YETKİLENDİRME) */}
        {activeTab === 'users' && isAnyAdmin && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 transition-colors">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>
                    {schoolMode ? 'Ek kullanıcılar (isteğe bağlı)' : isSuperAdmin
                      ? 'Yetki ve Kullanıcı Yönetim Merkezi (Ana Yetkili: Burak Şendağ)'
                      : `Okul Personel ve Kullanıcı Tanımlama (${currentUser.school_name})`}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {schoolMode ? 'İlk oluşturduğunuz hesapla bu bilgisayardaki tüm sınıfların yoklamasını alabilirsiniz. Başka bir kullanıcı eklemek zorunlu değildir; ek hesaplar da yalnızca bu bilgisayarda geçerlidir.' : isSuperAdmin
                    ? 'Yalnızca siz ve atadığınız admin arkadaşlarınız okul yöneticilerini (idarecileri) tanımlayabilir. İdareciler ise kendi okullarının öğretmenlerini tanımlar.'
                    : 'Okul yöneticisi (İdareci) olarak okulunuzun öğretmenlerini ve velilerini buradan tanımlayabilirsiniz.'}
                </p>
              </div>

              <button
                onClick={() => { setNewUserForm({...newUserForm,role:isSuperAdmin?'admin':'teacher',school_id:currentUser.school_id}); setNewUserModal(true); }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-2xl text-xs flex items-center space-x-1.5 shadow"
              >
                <span>+ Yeni Kullanıcı / İdareci Tanımla</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 overflow-x-auto transition-colors">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">Adı Soyadı</th>
                    <th className="p-3">Kullanıcı Adı & E-Posta</th>
                    <th className="p-3">Rol / Yetki Seviyesi</th>
                    <th className="p-3">Bağlı Olduğu Okul</th>
                    <th className="p-3">Tanımlayan Yetkili</th>
                    <th className="p-3">Kayıt Tarihi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {u.full_name}
                        {u.is_owner && (
                          <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold px-2 py-0.5 rounded-full">
                            Program Yazarı
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs">
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{u.username}</span>
                        <span className="block text-slate-400 text-[11px]">{u.email}</span>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                          u.role === 'superadmin'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                            : u.role === 'admin'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                            : u.role === 'teacher'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {u.role === 'superadmin' ? 'Ana Yetkili' : u.role === 'admin' ? 'Okul İdarecisi' : u.role === 'teacher' ? 'Öğretmen' : 'Veli/Öğrenci'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-600 dark:text-slate-300">{u.school_name || 'Merkez'}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{u.created_by_name || 'Sistem Kurucusu'}</td>
                      <td className="p-3 text-xs text-slate-400 font-mono">{u.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: QUEUE */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 transition-colors">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>30 Dakika Gecikmeli Yüksek Öncelikli Bildirim Kuyruğu</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Öğretmen yoklamayı kaydettiğinde bildirim anında gitmez; tam 30 dakika beklenir. Öğrenci geç gelirse yoklama güncellendiğinde bildirim otomatik iptal edilir.
                </p>
              </div>

              <button
                onClick={fetchQueue}
                className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Yenile</span>
              </button>
            </div>

            {queue.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Kuyrukta Bekleyen Bildirim Yok</h3>
                <p className="text-xs mt-1">Yoklama alınıp gelmeyen öğrenciler kaydedildiğinde 30 dakikalık geri sayım burada görünecektir.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {queue.map(item => (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-slate-800 rounded-3xl p-5 border shadow-xs flex flex-col justify-between transition ${
                      item.status === 'PENDING'
                        ? 'border-blue-200 dark:border-blue-800 bg-linear-to-br from-white to-blue-50/30 dark:from-slate-800 dark:to-blue-950/20'
                        : item.status === 'SENT'
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-700 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-extrabold text-base text-slate-900 dark:text-white">
                          {item.student_name_masked}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                          item.status === 'PENDING'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 animate-pulse'
                            : item.status === 'SENT'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {item.status === 'PENDING' ? '⏳ 30 Dk. Beklemede' : item.status === 'SENT' ? '✅ Gönderildi' : '✖️ İptal Edildi'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Sınıf & Ders:</span>
                          <span className="font-semibold">{item.class_name} • {item.period_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Öğretmen:</span>
                          <span className="font-semibold">{item.teacher_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Öğretmenin Kaydettiği Saat:</span>
                          <span className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded font-mono">
                            {item.absent_time_turkey} (TSİ)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Veli:</span>
                          <span className="font-semibold">{item.parent_name}</span>
                        </div>
                      </div>

                      {item.status === 'PENDING' && (
                        <div className="mt-4 p-3 bg-blue-100/70 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-blue-600 dark:text-blue-400" /> Kalan Bekleme Süresi:
                          </span>
                          <span className="text-sm font-black text-blue-700 dark:text-blue-300 font-mono">
                            {item.remainingFormatted}
                          </span>
                        </div>
                      )}
                    </div>

                    {item.status === 'PENDING' && (
                      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleCancelQueue(item.id)}
                          className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition"
                        >
                          İptal Et (Öğrenci Geldi)
                        </button>
                        {isAnyAdmin && (<button
                          type="button"
                          onClick={() => handleSendQueueNow(item.id)}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1 shadow transition active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          <span>Hemen Gönder (30 Dk Bekleme)</span>
                        </button>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: MATRIX */}
        {activeTab === 'matrix' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 transition-colors">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Ders Bazlı Bağımsız Yoklama Matrisi</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Öğrenciler bazen 1. derse girip 2. derse girmeyebilir veya önceki derse girmeyip sonrakine girebilir. Her ders saati bağımsız olarak takip edilir.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-200"
                >
                  {allClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} Sınıfı ({c.academic_year})</option>
                  ))}
                </select>
                <button
                  onClick={fetchMatrix}
                  className="bg-blue-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 shadow"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Matrisi Güncelle</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 overflow-x-auto transition-colors">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 w-16">No</th>
                    <th className="p-3">Öğrenci adı (maskeli)</th>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                      <th key={p} className="p-3 text-center">
                        {p}. Ders
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {matrixData.matrix && matrixData.matrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-750">
                      <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">{row.student_no}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{row.masked_name}</td>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(p => {
                        const status = row.periods ? row.periods[p] : '-';
                        return (
                          <td key={p} className="p-3 text-center">
                            {status === 'GELDI' ? (
                              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs px-2 py-0.5 rounded-md">
                                Geldi
                              </span>
                            ) : status === 'GELMEDI' ? (
                              <span className="bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 font-bold text-xs px-2 py-0.5 rounded-md">
                                Gelmedi
                              </span>
                            ) : status === 'GEC' ? (
                              <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-xs px-2 py-0.5 rounded-md">
                                Geç
                              </span>
                            ) : status === 'IZINLI' ? (
                              <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold text-xs px-2 py-0.5 rounded-md">
                                İzinli
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-mono">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'eokul' && isAnyAdmin && <section className="panel space-y-4"><h2 className="text-xl font-bold">Liste / ders programı içe aktar</h2><label className="grid gap-2">Dosya türü<select value={importKind} onChange={e=>setImportKind(e.target.value)}><option value="students">Öğrenci listesi</option><option value="schedule">Haftalık ders programı</option></select></label><p>e-Okul’dan dışa aktardığınız listeyi şablon başlıklarına göre düzenleyip XLSX veya UTF-8 CSV olarak yükleyin. Dosya en fazla 5 MB / 2000 öğrenci olabilir. Aynı okul numarası varsa bilgiler güncellenir. Şablondaki örnek satırı silin.</p><label className="grid gap-2">Hedef sınıf<select value={selectedClassId} onChange={e=>setSelectedClassId(e.target.value)}>{allClasses.map(c=><option key={c.id} value={c.id}>{c.school_name ? `${c.school_name} · ` : ''}{c.name} ({c.academic_year})</option>)}</select></label><button className="action" onClick={()=>downloadFile(`/api/e-okul/download-template?kind=${importKind}`,'dersteyim-sablon.xlsx')}>Excel şablonunu indir</button><label className="grid gap-2">Dosya seç ve içe aktar<input type="file" accept=".xlsx,.csv" disabled={!selectedClassId} onChange={handleImport}/></label><p className="text-sm">Resmî e-Okul sistemine doğrudan bağlantı kurulmaz.</p></section>}

        {/* TAB: HOMEWORK */}
        {activeTab === 'homework' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 transition-colors">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Ödev Yönetim Paneli</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Öğretmenler sınıflarına ödev atayabilir, veliler ve öğrenciler teslim tarihlerini takip edebilir.
                </p>
              </div>

              {(currentUser.role === 'teacher' || isAnyAdmin) && (
                <button
                  onClick={() => {setHwForm({...hwForm,classId:selectedClassId});setNewHwModal(true);}}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-2xl text-xs flex items-center space-x-1.5 shadow"
                >
                  <span>+ Yeni Ödev Tanımla</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {homeworks.map(hw => (
                <div key={hw.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {hw.class_name} • {hw.subject}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Son Teslim: {hw.due_date || 'Belirtilmedi'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{hw.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">{hw.description}</p>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Öğretmen: {hw.teacher_name}</span>
                    <span>Tarih: {hw.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 transition-colors">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Duyuru Sistemi</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Yöneticiler ve öğretmenler tüm okul veya belirli sınıf düzeyinde duyuru yayınlayabilir.
                </p>
              </div>

              <button
                onClick={() => {setAnnForm({...annForm,targetType:isAnyAdmin?'ALL':'CLASS',targetClassId:selectedClassId});setNewAnnModal(true);}}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-2xl text-xs flex items-center space-x-1.5 shadow"
              >
                <span>+ Yeni Duyuru Ekle</span>
              </button>
            </div>

            <div className="space-y-4">
              {announcements.map(ann => (
                <div key={ann.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      ann.priority === 'URGENT'
                        ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                        : ann.priority === 'IMPORTANT'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                    }`}>
                      {ann.priority === 'URGENT' ? 'Acil Duyuru' : ann.priority === 'IMPORTANT' ? 'Önemli' : 'Genel'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{ann.created_at}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{ann.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: DEVICES */}
        {activeTab === 'devices' && isAnyAdmin && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 transition-colors">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Cihaz Eşleştirme ve Erişim Güvenliği</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {schoolMode?'Bu yerel sürümde ilk giriş yapan cihaz otomatik onaylanır; hesap ve Windows erişim güvenliğini ayrıca yönetin.':'Öğretmenlerin ve personelin cihazlarını ve erişim durumlarını yönetebilirsiniz.'}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 overflow-x-auto transition-colors">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">Kullanıcı</th>
                    <th className="p-3">Cihaz Adı</th>
                    <th className="p-3">Parmak İzi</th>
                    <th className="p-3">Son Kullanım</th>
                    <th className="p-3 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {devices.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{d.full_name} ({d.title})</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{d.device_name}</td>
                      <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-400">{d.device_fingerprint}</td>
                      <td className="p-3 text-xs text-slate-400">{d.last_used_at}</td>
                      <td className="p-3 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          d.is_approved ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                        }`}>
                          {d.is_approved ? 'Onaylı Cihaz' : 'Onay bekliyor / engelli'}
                        </span>
                        <button className="ml-3 underline text-xs" onClick={async()=>{const r=await apiFetch(`/api/devices/${d.id}/toggle-approval`,{method:'POST'});if(r.ok)fetchAuxData();}}>{d.is_approved?'Engelle':'Onayla'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: OUTBOX */}
        {activeTab === 'outbox' && isAnyAdmin && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 transition-colors">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Yüksek Öncelikli E-Posta ve Bildirim Çıktı Kutusu</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sistem tarafından velilere gönderilen yüksek öncelikli (X-Priority: 1) SMTP sunucusu tarafından kabul edilen e-posta kayıtları. Teslim/alıcı okundu bilgisi değildir.
              </p>
            </div>

            <div className="space-y-3">
              {sentNotifications.map(n => (
                <div key={n.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                        Yüksek Öncelik ({n.priority})
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{n.subject}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{n.body}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Alıcı: {n.recipient} • Kanal: {n.channel}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{n.created_at}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: AUDIT LOGS (KVKK LOG DEFTERİ) */}
        {activeTab === 'logs' && isAnyAdmin && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 transition-colors">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Erişim ve İşlem Günlüğü</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Her kimlik görüntüleme, yoklama kaydetme, acil durum tetikleme ve sistem erişimi zaman damgası, kullanıcı bilgisi, IP adresi ve cihaz bilgisi ile silinemez kayıt altındadır.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700 overflow-x-auto transition-colors">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">Zaman (TSİ)</th>
                    <th className="p-3">Kullanıcı</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">İşlem / Eylem</th>
                    <th className="p-3">IP & Cihaz</th>
                    <th className="p-3">Detaylar / Gerekçe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {auditLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{l.timestamp}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{l.user_name}</td>
                      <td className="p-3 uppercase text-[10px] font-semibold text-slate-600 dark:text-slate-400">{l.role}</td>
                      <td className={`p-3 font-bold ${
                        l.action.includes('REVEAL') ? 'text-amber-600 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'
                      }`}>
                        {l.action}
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{l.ip_address}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{l.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* MODAL 1: UNIVERSAL KVKK REVEAL ("LOGLU SİSTEM") */}
      {universalRevealStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
            <div className="flex items-center space-x-2 text-blue-900 dark:text-blue-300 mb-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-lg font-black">KVKK Korumalı Bilgileri Çözümleme ("Loglu Sistem")</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              Öğrenci: <strong>{universalRevealStudent.masked_name}</strong> (No: {universalRevealStudent.student_no})<br />
              Bu uygulamada bu kayıt çözümlendiğinde girdiğiniz <strong>gerekçe, IP adresiniz, cihaz bilginiz ve zaman damgası</strong> erişim günlüğüne yazılacaktır.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Yetkili Şifreniz
                </label>
                <input
                  type="password"
                  placeholder="Şifrenizi giriniz..."
                  value={revealPassword}
                  onChange={(e) => setRevealPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Görüntüleme Gerekçesi (Resmi Kayıt Altına Alınır)
                </label>
                <input
                  type="text"
                  value={revealReason}
                  onChange={(e) => setRevealReason(e.target.value)}
                  placeholder="Örn: Veli görüşmesi / MEB resmi yazışması"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Revealed Real Data Card */}
              {revealedResult && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl mt-4 space-y-2 text-xs">
                  <div className="text-emerald-900 dark:text-emerald-200 font-bold flex items-center mb-1">
                    <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                    Çözümlenen Gerçek Kişisel Veriler (Audit Kaydı Alındı):
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-200">
                    <div>Öğrenci Adı Soyadı:</div>
                    <div className="font-bold">{revealedResult.real_full_name}</div>
                    <div>T.C. Kimlik No:</div>
                    <div className="font-mono font-bold text-emerald-800 dark:text-emerald-300">{revealedResult.real_tc}</div>
                    <div>Veli Adı Soyadı:</div>
                    <div className="font-bold">{revealedResult.real_parent_name}</div>
                    <div>Veli Telefon:</div>
                    <div className="font-mono font-bold">{revealedResult.real_parent_phone}</div>
                    <div>Veli E-Posta:</div>
                    <div className="font-bold">{revealedResult.real_parent_email}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setUniversalRevealStudent(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold"
              >
                Kapat
              </button>
              {!revealedResult && (
                <button
                  type="button"
                  onClick={handleUniversalReveal}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
                >
                  Onayla ve Çözümle
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NEW USER / ADMIN (SUPERADMIN & SCHOOL ADMIN) */}
      {newUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateUser} className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center">
              <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              {isSuperAdmin ? 'Yeni Okul İdarecisi veya Yetkili Tanımla' : 'Yeni Öğretmen veya Personel Ekle'}
            </h3>

            <div className="space-y-3 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">Yetki Rolü</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                  >
                    {isSuperAdmin && <option value="admin">🏫 Okul Yöneticisi (İdareci)</option>}
                    {currentUser.is_owner && <option value="superadmin">👑 Eş Sistem Yöneticisi (Superadmin)</option>}
                    <option value="teacher">👨‍🏫 Öğretmen</option>
                    <option value="parent">👨‍👧 Veli / Öğrenci</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Bağlı Olduğu Okul</label>
                  <select
                    value={newUserForm.school_id}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setNewUserForm({ ...newUserForm, school_id: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                  >
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1">Adı Soyadı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Selçuk Kaya"
                  value={newUserForm.full_name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">Kullanıcı Adı</label>
                  <input
                    type="text"
                    required
                    placeholder="selcuk.kaya"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block mb-1">E-Posta Adresi</label>
                  <input
                    type="email"
                    required
                    placeholder="selcuk@okulyonetimi.k12.tr"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">İlk Giriş Şifresi</label>
                  <input
                    type="password"
                    required
                    placeholder="En az 12 karakter" minLength={12}
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block mb-1">Ünvan / Branş</label>
                  <input
                    type="text"
                    placeholder="Müdür Yardımcısı / Kimya Öğretmeni"
                    value={newUserForm.title}
                    onChange={(e) => setNewUserForm({ ...newUserForm, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setNewUserModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold"
              >
                İptal
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow"
              >
                Kullanıcıyı Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: EMERGENCY SOS */}
      {emergencyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-red-600 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <Flame className="w-8 h-8 animate-bounce" />
              <h3 className="text-xl font-black uppercase tracking-tight">ACİL DURUM ALARMI TETİKLE</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              {schoolMode?'Onaydan sonra alarm bu bilgisayarın hoparlöründen çalar ve ekranda görünür. SMS, telefon araması veya push gönderilmez. Kurumun acil durum sistemlerinin yerine geçmez.':'Seçilen okulun açık ekranlarında alarm görünür. Bildirim merkezine kayıt eklenir; izin veren cihazlara push gönderimi denenir.'}
            </p>

            <div className="space-y-4">
              {isSuperAdmin && <label className="grid gap-1 my-3">Hedef okul<select className="p-2 border rounded" value={emergencySchool} onChange={e=>setEmergencySchool(e.target.value)}>{schools.map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}</select></label>}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Acil Durum Türü</label>
                <select
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-red-700 dark:text-red-400"
                >
                  <option value="YANGIN">🔥 Yangın Alarmı</option>
                  <option value="DEPREM">🌋 Deprem Alarmı</option>
                  <option value="TAHLIYE">🏃 Acil Tahliye</option>
                  <option value="GUVENLIK">🛡️ Güvenlik / Kilitlenme (Lockdown)</option>
                  <option value="SAGLIK">🚑 Tıbbi / Sağlık Acil Durumu</option>
                </select>
              </div>

              <div className="text-sm"><button type="button" disabled={!!activeEmergency} onClick={handleEmergencyPreview} className="underline font-semibold disabled:opacity-50">Seçili sesi dene</button>{activeEmergency && <span className="ml-2">Etkin alarm varken ses denemesi yapılamaz.</span>}{emergencyPreviewMessage && <p role="status" className="mt-1">{emergencyPreviewMessage}</p>}</div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Yayınlanacak Anlık Mesaj</label>
                <textarea
                  rows="3"
                  value={emergencyMessage}
                  onChange={(e) => setEmergencyMessage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={emergencyBusy}
                onClick={() => { emergencyPreviewSequence.current++; if (!activeEmergency) emergencyAudio.current.stop(); setEmergencyPreviewMessage(''); setEmergencyModalOpen(false); }}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleTriggerEmergency}
                disabled={emergencyBusy}
                className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition active:scale-95"
              >
                {emergencyBusy ? 'ALARM BAŞLATILIYOR…' : 'ALARMI ONAYLA VE BAŞLAT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: NEW HOMEWORK */}
      {newHwModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateHomework} className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" /> Yeni Ödev Ekle
            </h3>
            <div className="space-y-3 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div>
                <label className="block mb-1">Ödev Başlığı</label>
                <input
                  type="text"
                  required
                  value={hwForm.title}
                  onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
                  placeholder="Örn: Fonksiyonlar Çalışma Soruları"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-normal text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">Sınıf</label>
                  <select
                    value={hwForm.classId}
                    onChange={(e) => setHwForm({ ...hwForm, classId: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-normal text-slate-800 dark:text-slate-100"
                  >
                    {allClasses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.academic_year})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Son Teslim Tarihi</label>
                  <input
                    type="date"
                    value={hwForm.dueDate}
                    onChange={(e) => setHwForm({ ...hwForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-normal text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1">Açıklama</label>
                <textarea
                  rows="3"
                  value={hwForm.description}
                  onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })}
                  placeholder="Ödev yönergeleri..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm font-normal text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setNewHwModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold"
              >
                İptal
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
              >
                Ödevi Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: NEW ANNOUNCEMENT */}
      {newAnnModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateAnnouncement} className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" /> Yeni Duyuru Yayınla
            </h3>
            <div className="space-y-3 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div>
                <label className="block mb-1">Duyuru Başlığı</label>
                <input
                  type="text"
                  required
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  placeholder="Örn: Veli Toplantısı Bildirimi"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-normal text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">Öncelik</label>
                  <select
                    value={annForm.priority}
                    onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-normal text-slate-800 dark:text-slate-100"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="IMPORTANT">Önemli</option>
                    <option value="URGENT">Acil</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Hedef Kitle</label>
                  <select
                    value={annForm.targetType}
                    onChange={(e) => setAnnForm({ ...annForm, targetType: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-normal text-slate-800 dark:text-slate-100"
                  >
                    <option value="ALL">Tüm Okul</option>
                    <option value="CLASS">Belirli Sınıf</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1">Duyuru İçeriği</label>
                <textarea
                  rows="3"
                  required
                  value={annForm.content}
                  onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                  placeholder="Duyuru metni..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm font-normal text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setNewAnnModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold"
              >
                İptal
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
              >
                Duyuruyu Yayınla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 6: LICENSE & HEALTH DIAGNOSTICS */}
      {licenseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3 text-blue-900 dark:text-blue-300 mb-3">
              <School className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-lg font-black">Telif & Açık Kaynak Lisans Bilgisi</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Niğde İl Millî Eğitim Müdürlüğü - YEĞİTEK Birimi</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800">
                <span className="font-bold text-blue-900 dark:text-blue-200 block mb-1">🏛️ Kurumsal Telif ve Mülkiyet:</span>
                Telif Hakkı (c) 2026 <strong>Niğde İl Millî Eğitim Müdürlüğü</strong> - Yenilik ve Eğitim Teknolojileri (YEĞİTEK) Birimi.<br />
                Sistem Mimarı ve Yazar: <strong>Burak Şendağ</strong>.
              </div>

              <div>
                <span className="font-bold text-slate-900 dark:text-white block mb-1">📜 Açık Kaynak Lisansı (MIT License):</span>
                Bu yazılım, eğitim teknolojilerini desteklemek amacıyla MIT Açık Kaynak Lisansı ile lisanslanmıştır.
              </div>

              <div>
                <span className="font-bold text-slate-900 dark:text-white block mb-1">🔒 Kişisel Veri Koruma Özellikleri:</span>
                T.C. kimlik numarası AES-256-GCM ile şifrelenir. Öğrenci ve veli bilgileri listelerde maskelenir. Yetkili veri görüntüleme ve değişiklik işlemleri günlüğe kaydedilir. Uygulama bir resmî uygunluk belgesi sunmaz.
              </div>

              {/* Health Diagnostics */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center">
                    <Activity className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400" /> Sistem Sağlık & Cold Start Tanısı:
                  </span>
                  <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {healthData?.status || 'Bilinmiyor'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  <div>⚡ Cold Start: <strong className="text-blue-600 dark:text-blue-400">{healthData?.coldStartMs ?? '—'} ms</strong></div>
                  <div>💾 Veritabanı: <strong className="text-emerald-600 dark:text-emerald-400">{healthData?.database?.status || 'Bilinmiyor'}</strong></div>
                  <div>⏱️ Çalışma Süresi: <strong>{healthData?.uptimeSeconds || 0} sn</strong></div>
                  <div>🧠 Bellek: <strong>{healthData?.memory?.heapUsedMB ?? '—'} MB</strong></div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setLicenseModalOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-2xl text-xs shadow"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 text-xs py-5 border-t border-slate-800 dark:border-slate-800/80 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-300">
              © 2026 Niğde İl Millî Eğitim Müdürlüğü • YEĞİTEK Birimi • Programın Yazarı: Burak Şendağ
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Açık Kaynak Kodlu (MIT Lisansı) • Kişisel veri maskeleme ve erişim kaydı "Loglu Sistem"
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => { setLicenseModalOpen(true); fetchHealthInfo(); }}
              className="text-blue-400 hover:text-blue-300 underline font-semibold flex items-center"
            >
              <Info className="w-3.5 h-3.5 mr-1" /> Telif & Lisans Bilgisi
            </button>
            <span>Türkiye Saati: {turkeyTime.time || '15:30'}</span>
            <span>AES-256-GCM Kripto Koruması</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
