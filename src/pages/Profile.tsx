import { useState, useRef } from "react";
import { Camera, Save, Lock, User, Phone, Mail, Briefcase, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";

export default function Profile() {
  const { currentUser, updateProfile, setPasswordDirect } = useAuthStore();
  const { addActivityLog } = useSettingsStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentUser?.name || "");
  const [designation, setDesignation] = useState(currentUser?.designation || "");
  const [mobile, setMobile] = useState(currentUser?.mobile || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [department, setDepartment] = useState(currentUser?.department || "");
  const [employeeId, setEmployeeId] = useState(currentUser?.employeeId || "");
  const [photo, setPhoto] = useState(currentUser?.photo || "");

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setPhoto(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    if (!currentUser) return;
    updateProfile(currentUser.id, { name, designation, mobile, email, department, employeeId, photo });
    addActivityLog({ userId: currentUser.id, userName: currentUser.name, action: "Updated profile", module: "auth", details: `Name: ${name}` });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleChangePassword = () => {
    setPwError(""); setPwSuccess(false);
    if (!newPw || !confirmPw) { setPwError("Both fields are required"); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); return; }
    if (newPw.length < 4) { setPwError("Password must be at least 4 characters"); return; }
    if (!currentUser) return;
    setPasswordDirect(currentUser.id, newPw);
    setPwSuccess(true); setNewPw(""); setConfirmPw("");
    addActivityLog({ userId: currentUser.id, userName: currentUser.name, action: "Changed own password", module: "auth", details: "" });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2"><User className="size-5 text-gold" /> Personal Profile</h3>

        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            {photo ? (
              <img src={photo} alt="Profile" className="size-24 rounded-full object-cover border-4 border-gold/20" />
            ) : (
              <div className="size-24 rounded-full gold-gradient flex items-center justify-center text-3xl font-bold text-white border-4 border-gold/20">
                {currentUser?.name?.charAt(0) || "?"}
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 size-8 rounded-full bg-gold text-white flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity" title="Upload photo">
              <Camera className="size-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div>
            <h4 className="text-lg font-semibold">{currentUser?.name}</h4>
            <p className="text-sm text-muted-foreground">{currentUser?.designation}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded mt-1 inline-block ${currentUser?.role === "admin" ? "bg-gold/20 text-gold" : "bg-gray-100 text-gray-600"}`}>{currentUser?.role === "admin" ? "Administrator" : "Standard User"}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-1.5"><User className="size-3" /> Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Briefcase className="size-3" /> Designation</Label>
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Phone className="size-3" /> Mobile No</Label>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} className="mt-1" placeholder="9876543210" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Mail className="size-3" /> Email ID</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="user@cnci.gov.in" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Briefcase className="size-3" /> Department</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Hash className="size-3" /> Employee ID</Label>
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="mt-1" placeholder="Optional" />
          </div>
        </div>
        {profileSaved && <p className="text-xs text-green-600 mt-3">Profile saved successfully!</p>}
        <Button onClick={handleSaveProfile} className="mt-4 gap-1.5 gold-gradient text-white border-0"><Save className="size-4" /> Save Profile</Button>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-display font-semibold flex items-center gap-2 mb-4"><Lock className="size-4 text-gold" /> Change Password</h3>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div><Label>New Password</Label><Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="mt-1" placeholder="Enter new password" /></div>
          <div><Label>Re-enter New Password</Label><Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="mt-1" placeholder="Confirm new password" /></div>
        </div>
        {pwError && <p className="text-xs text-red-600 mt-2">{pwError}</p>}
        {pwSuccess && <p className="text-xs text-green-600 mt-2">Password changed successfully!</p>}
        <Button size="sm" onClick={handleChangePassword} className="mt-3 gold-gradient text-white border-0">Change Password</Button>
      </div>
    </div>
  );
}
