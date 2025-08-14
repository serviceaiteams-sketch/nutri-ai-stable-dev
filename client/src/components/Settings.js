import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaUser,
  FaCog, 
  FaCamera,
  FaEdit,
  FaSave,
  FaSpinner,
  FaAt,
  FaEnvelope,
  FaPhone,
  FaBirthdayCake,
  FaVenusMars,
  FaRuler,
  FaWeight,
  FaRunning,
  FaLeaf,
  FaAllergies,
  FaPills,
  FaShieldAlt,
  FaGoogle,
  FaFacebook,
  FaLanguage,
  FaGlobe,
  FaTrash,
  FaBell
} from 'react-icons/fa';

const Settings = () => {
  // Tabs: profile | settings
  const [activeTab, setActiveTab] = useState('settings');

  // Profile data
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    activity_level: '',
    health_goal: '',
    dietary_preferences: '',
    allergies: '',
    medical_conditions: '',
    username: '',
    email: '',
    phone: '',
    dob: '',
    bio: '',
    profile_visibility: 'friends'
  });

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);

  // Account settings
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [notify, setNotify] = useState({ email: true, sms: false, push: true });
  const [linked, setLinked] = useState({ google: false, facebook: false });
  const [language, setLanguage] = useState('en');
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [sessionTimeout, setSessionTimeout] = useState(30);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const profileResponse = await axios.get('/api/users/profile');
        setUser(profileResponse.data.user);
        setFormData(prev => ({
          ...prev,
          name: profileResponse.data.user.name || '',
          age: profileResponse.data.user.age || '',
          gender: profileResponse.data.user.gender || '',
          height: profileResponse.data.user.height || '',
          weight: profileResponse.data.user.weight || '',
          activity_level: profileResponse.data.user.activity_level || '',
          health_goal: profileResponse.data.user.health_goal || '',
          dietary_preferences: profileResponse.data.user.dietary_preferences || '',
          allergies: profileResponse.data.user.allergies || '',
          medical_conditions: profileResponse.data.user.medical_conditions || '',
          email: profileResponse.data.user.email || prev.email,
          phone: profileResponse.data.user.phone || prev.phone,
          username: profileResponse.data.user.username || prev.username,
          dob: profileResponse.data.user.dob || prev.dob,
          bio: profileResponse.data.user.bio || prev.bio,
          profile_visibility: profileResponse.data.user.profile_visibility || prev.profile_visibility
        }));
        if (typeof profileResponse.data.user.twofa_enabled !== 'undefined') {
          setTwoFAEnabled(!!profileResponse.data.user.twofa_enabled);
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const allowedProfileKeys = [
    'name','age','gender','height','weight','activity_level','health_goal','dietary_preferences','allergies','medical_conditions'
  ];

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {};
      allowedProfileKeys.forEach(k => { if (formData[k] !== undefined) payload[k] = formData[k]; });
      const response = await axios.put('/api/users/profile', payload);
      setUser(response.data.user);
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to update profile');
    }
  };

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
      toast.error('Please upload a valid image');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async () => {
    if (!avatarFile) { toast.error('Choose an image first'); return; }
    try {
      const fd = new FormData();
      fd.append('avatar', avatarFile);
      await axios.post('/api/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not upload photo');
    }
  };

  const requestEmailVerification = async () => {
    if (!/^\S+@\S+\.\S+$/.test(formData.email || '')) { toast.error('Enter a valid email'); return; }
    try {
      await axios.post('/api/auth/request-email-change', { email: formData.email });
      toast.success('Verification email sent');
    } catch {
      toast.error('Could not send email verification');
    }
  };

  const requestPhoneOTP = async () => {
    if (!/^[\d\s\-+()]{7,}$/.test(formData.phone || '')) { toast.error('Enter a valid phone'); return; }
    try {
      await axios.post('/api/users/request-phone-otp', { phone: formData.phone });
      toast.success('OTP sent to phone');
    } catch {
      toast.error('Could not send phone OTP');
    }
  };

  const passwordScore = (p) => {
    let score = 0; if (!p) return 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return Math.min(score, 5);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) { toast.error('Passwords do not match'); return; }
    if (passwordScore(pwd.next) < 3) { toast.error('Password too weak'); return; }
    try {
      await axios.post('/api/auth/change-password', { currentPassword: pwd.current, newPassword: pwd.next });
      toast.success('Password updated');
      setPwd({ current: '', next: '', confirm: '' });
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to change password'); }
  };

  const toggle2FA = async () => {
    try {
      if (!twoFAEnabled) {
        // Step 1: request secret
        const { data } = await axios.post('/api/auth/2fa/enable');
        if (data && data.secret) {
          const code = window.prompt(`Scan in your authenticator app. Secret: ${data.secret}\nOr use otpauth URL in apps like Google Authenticator.\nEnter the 6-digit code to confirm:`);
          if (!code) { toast.error('2FA setup canceled'); return; }
          await axios.post('/api/auth/2fa/enable', { token: String(code).trim() });
          toast.success('2FA enabled');
          setTwoFAEnabled(true);
        } else {
          toast.error('Failed to initiate 2FA');
        }
      } else {
        await axios.post('/api/auth/2fa/disable');
        toast.success('2FA disabled');
        setTwoFAEnabled(false);
      }
    } catch (e) { toast.error(e?.response?.data?.error || 'Could not update 2FA'); }
  };

  const saveNotifications = async () => {
    try { await axios.post('/api/users/notifications', notify); toast.success('Notification preferences saved'); }
    catch { toast.success('Saved locally'); }
    localStorage.setItem('notifyPrefs', JSON.stringify(notify));
  };

  const toggleLink = async (provider) => {
    try {
      if (!linked[provider]) { await axios.post(`/api/auth/link/${provider}`); setLinked(prev=>({...prev,[provider]:true})); toast.success(`Linked ${provider}`); }
      else { await axios.post(`/api/auth/unlink/${provider}`); setLinked(prev=>({...prev,[provider]:false})); toast.success(`Unlinked ${provider}`); }
    } catch { toast.error('Operation failed'); }
  };

  const saveLocale = () => { localStorage.setItem('language', language); localStorage.setItem('timeZone', timeZone); toast.success('Language and time zone saved'); };
  const saveSessionTimeout = () => { localStorage.setItem('sessionTimeoutMinutes', String(sessionTimeout)); toast.success('Session timeout preference saved'); };

  const handleDeleteAccount = async () => {
    try { await axios.delete('/api/users/account'); toast.success('Account deleted'); window.location.href = '/login'; }
    catch { toast.error('Failed to delete account'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <FaSpinner className="animate-spin h-8 w-8 text-blue-500" />
              </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-[2px] bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <FaCog className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">Manage your profile and account</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg" role="tablist">
            <button onClick={()=>setActiveTab('profile')} className={`flex-1 py-2 px-4 rounded-md transition-colors ${activeTab==='profile'?'bg-white text-green-600 shadow-sm':'text-gray-600 hover:text-gray-900'}`} role="tab" aria-selected={activeTab==='profile'}>
              <FaUser className="h-4 w-4 inline mr-2" /> Profile
            </button>
            <button onClick={()=>setActiveTab('settings')} className={`flex-1 py-2 px-4 rounded-md transition-colors ${activeTab==='settings'?'bg-white text-green-600 shadow-sm':'text-gray-600 hover:text-gray-900'}`} role="tab" aria-selected={activeTab==='settings'}>
              <FaCog className="h-4 w-4 inline mr-2" /> Settings
            </button>
          </div>
        </motion.div>
      </div>

      {/* Profile tab */}
      {activeTab==='profile' && (
        <div className="rounded-2xl p-[2px] bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              {!editing && (
                <button onClick={()=>setEditing(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                  <FaEdit className="h-4 w-4 inline mr-2" /> Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Avatar */}
                  <div className="md:col-span-2 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border">
                      {avatarPreview ? (<img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />) : (<div className="w-full h-full grid place-items-center text-gray-400">IMG</div>)}
                    </div>
                    <div>
                      <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer bg-white hover:bg-gray-50">
                        <FaCamera /> <span>Upload Photo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} aria-label="Upload profile picture" />
                      </label>
                      {avatarFile && (
                        <button type="button" onClick={uploadAvatar} className="ml-3 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Save Photo</button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaUser className="h-4 w-4 inline mr-2" /> Full Name</label>
                    <input type="text" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your full name" aria-label="Full Name" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaAt className="h-4 w-4 inline mr-2" /> Username</label>
                    <input type="text" value={formData.username} onChange={e=>setFormData({...formData,username:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Choose a username" aria-label="Username" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaEnvelope className="h-4 w-4 inline mr-2" /> Email Address</label>
                    <div className="flex gap-2">
                      <input type="email" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="name@example.com" aria-label="Email" />
                      <button type="button" onClick={requestEmailVerification} className="px-3 py-2 border rounded-md text-blue-600 hover:bg-blue-50">Verify</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaPhone className="h-4 w-4 inline mr-2" /> Phone Number</label>
                    <div className="flex gap-2">
                      <input type="tel" value={formData.phone} onChange={e=>setFormData({...formData,phone:e.target.value})} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., +1 555 555 5555" aria-label="Phone Number" />
                      <button type="button" onClick={requestPhoneOTP} className="px-3 py-2 border rounded-md text-blue-600 hover:bg-blue-50">Verify</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaBirthdayCake className="h-4 w-4 inline mr-2" /> Date of Birth</label>
                    <input type="date" value={formData.dob} onChange={e=>setFormData({...formData,dob:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Date of Birth" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaVenusMars className="h-4 w-4 inline mr-2" /> Gender</label>
                    <select value={formData.gender} onChange={e=>setFormData({...formData,gender:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Gender">
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaRuler className="h-4 w-4 inline mr-2" /> Height (cm)</label>
                    <input type="number" value={formData.height} onChange={e=>setFormData({...formData,height:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter height in cm" min="100" max="250" aria-label="Height" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaWeight className="h-4 w-4 inline mr-2" /> Weight (kg)</label>
                    <input type="number" value={formData.weight} onChange={e=>setFormData({...formData,weight:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter weight in kg" min="30" max="300" aria-label="Weight" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaRunning className="h-4 w-4 inline mr-2" /> Activity Level</label>
                    <select value={formData.activity_level} onChange={e=>setFormData({...formData,activity_level:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Activity Level">
                      <option value="">Select activity level</option>
                      <option value="sedentary">Sedentary (little or no exercise)</option>
                      <option value="moderate">Moderate (1-3 days/week)</option>
                      <option value="active">Active (3-5 days/week)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaLeaf className="h-4 w-4 inline mr-2" /> Dietary Preferences</label>
                    <input type="text" value={formData.dietary_preferences} onChange={e=>setFormData({...formData,dietary_preferences:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., vegetarian, vegan, gluten-free" aria-label="Dietary Preferences" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaAllergies className="h-4 w-4 inline mr-2" /> Allergies</label>
                    <input type="text" value={formData.allergies} onChange={e=>setFormData({...formData,allergies:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., nuts, dairy, shellfish" aria-label="Allergies" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaPills className="h-4 w-4 inline mr-2" /> Medical Conditions</label>
                    <input type="text" value={formData.medical_conditions} onChange={e=>setFormData({...formData,medical_conditions:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., diabetes, hypertension, heart disease" aria-label="Medical Conditions" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brief Bio</label>
                    <textarea value={formData.bio} onChange={e=>setFormData({...formData,bio:e.target.value.slice(0,200)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} maxLength={200} aria-label="Bio" />
                    <div className="text-xs text-gray-500 mt-1">{(formData.bio||'').length}/200</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                    <select value={formData.profile_visibility} onChange={e=>setFormData({...formData,profile_visibility:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Profile Visibility">
                      <option value="public">Public</option>
                      <option value="friends">Friends only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button type="button" onClick={()=>setEditing(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><FaSave className="h-4 w-4 inline mr-2" /> Save Changes</button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><p className="text-gray-900">{user?.name || 'Not provided'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Age</label><p className="text-gray-900">{user?.age ? `${user.age} years` : 'Not provided'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Gender</label><p className="text-gray-900 capitalize">{user?.gender || 'Not provided'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Height</label><p className="text-gray-900">{user?.height ? `${user.height} cm` : 'Not provided'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Weight</label><p className="text-gray-900">{user?.weight ? `${user.weight} kg` : 'Not provided'}</p></div>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label><p className="text-gray-900">{user?.activity_level || 'Not provided'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Health Goal</label><p className="text-gray-900">{user?.health_goal?.replace('_',' ') || 'Not provided'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Dietary Preferences</label><p className="text-gray-900">{user?.dietary_preferences || 'None specified'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label><p className="text-gray-900">{user?.allergies || 'None specified'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions</label><p className="text-gray-900">{user?.medical_conditions || 'None specified'}</p></div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Settings tab */}
      {activeTab==='settings' && (
        <div className="rounded-2xl p-[2px] bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Settings</h2>
            <div className="space-y-6">
              {/* Password */}
              <div className="border border-gray-200 rounded-lg p-4" aria-labelledby="pwd-title">
                <div className="flex items-center gap-2 mb-3"><FaShieldAlt className="text-blue-500" /><h3 id="pwd-title" className="font-semibold text-gray-900">Password</h3></div>
                <form onSubmit={changePassword} className="grid md:grid-cols-3 gap-3">
                  <input type="password" aria-label="Current password" placeholder="Current password" className="px-3 py-2 border rounded-md" value={pwd.current} onChange={e=>setPwd({...pwd,current:e.target.value})} required />
                  <div>
                    <input type="password" aria-label="New password" placeholder="New password" className="w-full px-3 py-2 border rounded-md" value={pwd.next} onChange={e=>setPwd({...pwd,next:e.target.value})} required />
                    <div className="mt-2 h-1 w-full bg-gray-200 rounded"><div className={`h-1 rounded ${['w-1/6 bg-red-500','w-2/6 bg-orange-500','w-3/6 bg-yellow-500','w-4/6 bg-green-500','w-5/6 bg-emerald-600'][passwordScore(pwd.next)-1] || ''}`}></div></div>
                  </div>
                  <input type="password" aria-label="Confirm password" placeholder="Confirm new password" className="px-3 py-2 border rounded-md" value={pwd.confirm} onChange={e=>setPwd({...pwd,confirm:e.target.value})} required />
                  <div className="md:col-span-3 flex justify-end"><button type="submit" className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Update Password</button></div>
                </form>
              </div>

              {/* 2FA */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><FaShieldAlt className="text-purple-500" /><div><h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3><p className="text-sm text-gray-600">Use an authenticator app for extra security.</p></div></div>
                  <button onClick={toggle2FA} className={`px-4 py-2 rounded-md ${twoFAEnabled ? 'bg-purple-600 text-white' : 'border text-purple-700'}`}>{twoFAEnabled ? 'Disable' : 'Enable'}</button>
                </div>
              </div>

              {/* Notifications */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3"><FaBell className="text-green-500" /><h3 className="font-semibold text-gray-900">Notification Preferences</h3></div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={notify.email} onChange={e=>setNotify({...notify,email:e.target.checked})} /> Email</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={notify.sms} onChange={e=>setNotify({...notify,sms:e.target.checked})} /> SMS</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={notify.push} onChange={e=>setNotify({...notify,push:e.target.checked})} /> Push</label>
                  <div className="flex justify-end"><button onClick={saveNotifications} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save</button></div>
                </div>
                        </div>

              {/* Linked accounts */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3"><FaShieldAlt className="text-gray-600" /><h3 className="font-semibold text-gray-900">Linked Accounts</h3></div>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={()=>toggleLink('google')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-md ${linked.google?'bg-red-50 text-red-700 border-red-300 border':'border'}`} aria-label="Link Google"><FaGoogle /> {linked.google?'Unlink Google':'Link Google'}</button>
                  <button onClick={()=>toggleLink('facebook')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-md ${linked.facebook?'bg-red-50 text-red-700 border-red-300 border':'border'}`} aria-label="Link Facebook"><FaFacebook /> {linked.facebook?'Unlink Facebook':'Link Facebook'}</button>
                </div>
                        </div>
                        
              {/* Language / Timezone */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3"><FaLanguage className="text-indigo-500" /><h3 className="font-semibold text-gray-900">Language & Time Zone</h3></div>
                <div className="grid md:grid-cols-3 gap-3">
                  <select value={language} onChange={e=>setLanguage(e.target.value)} className="px-3 py-2 border rounded-md" aria-label="Language">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                  <select value={timeZone} onChange={e=>setTimeZone(e.target.value)} className="px-3 py-2 border rounded-md" aria-label="Time Zone">
                    {Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone').map(tz => (<option key={tz} value={tz}>{tz}</option>)) : (<option value="UTC">UTC</option>)}
                  </select>
                  <div className="flex items-center justify-end"><button onClick={saveLocale} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button></div>
                </div>
              </div>

              {/* Session timeout */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3"><FaGlobe className="text-teal-600" /><h3 className="font-semibold text-gray-900">Session Timeout</h3></div>
                <div className="grid md:grid-cols-3 gap-3 items-center">
                  <label className="text-sm text-gray-700" htmlFor="timeout">Auto-logout after minutes of inactivity</label>
                  <input id="timeout" type="number" min={5} max={240} value={sessionTimeout} onChange={e=>setSessionTimeout(Number(e.target.value))} className="px-3 py-2 border rounded-md" aria-label="Session timeout minutes" />
                  <div className="flex justify-end"><button onClick={saveSessionTimeout} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">Save</button></div>
                        </div>
                      </div>

              {/* Danger zone */}
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3"><FaTrash className="h-5 w-5 text-red-500" /><div><h3 className="font-semibold text-gray-900">Delete Account</h3><p className="text-sm text-gray-600">Permanently delete your account and all data</p></div></div>
                  <button onClick={()=>setShowDeleteConfirm(true)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
              </div>
                </div>
              </motion.div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="flex items-center space-x-3 mb-4"><FaTrash className="h-6 w-6 text-red-500" /><h3 id="delete-title" className="text-lg font-semibold text-gray-900">Delete Account</h3></div>
            <p className="text-gray-600 mb-6">Are you sure you want to delete your account? This action cannot be undone.</p>
            <div className="flex space-x-3">
              <button onClick={()=>setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteAccount} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Delete Account</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Settings; 