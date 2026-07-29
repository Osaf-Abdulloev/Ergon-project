"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { WorkerProfile, Company } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { User, Briefcase, Building2, Save, Plus, CheckCircle, MapPin } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [desiredPosition, setDesiredPosition] = useState("");
  const [desiredSalary, setDesiredSalary] = useState("");
  const [bio, setBio] = useState("");
  const [education, setEducation] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skillsList, setSkillsList] = useState<string[]>([]);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");

  const { data: workerProfile } = useQuery({
    queryKey: ["my-worker-profile"],
    queryFn: async () => {
      const res = await api.get<WorkerProfile>("/users/me/worker-profile");
      const p = res.data;
      setDesiredPosition(p.desired_position || "");
      setDesiredSalary(p.desired_salary ? p.desired_salary.toString() : "");
      setBio(p.bio || "");
      setEducation(p.education || "");
      setSkillsList(p.skills ? p.skills.map((s) => s.name) : []);
      return p;
    },
    enabled: user?.role === "worker",
  });

  const { data: companyProfile } = useQuery({
    queryKey: ["my-company-profile"],
    queryFn: async () => {
      const res = await api.get<Company>("/users/me/company-profile");
      const c = res.data;
      setCompanyName(c.company_name || "");
      setIndustry(c.industry || "");
      setDescription(c.description || "");
      return c;
    },
    enabled: user?.role === "employer",
  });

  const updateWorkerMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put<WorkerProfile>("/users/me/worker-profile", {
        desired_position: desiredPosition,
        desired_salary: desiredSalary ? parseFloat(desiredSalary) : null,
        bio,
        education,
        skills: skillsList,
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg("Профили шумо бо муваффақият нигоҳ дошта шуд!");
      queryClient.invalidateQueries({ queryKey: ["my-worker-profile"] });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put<Company>("/users/me/company-profile", {
        company_name: companyName,
        industry,
        description,
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg("Профили ширкат нигоҳ дошта шуд!");
      queryClient.invalidateQueries({ queryKey: ["my-company-profile"] });
    },
  });

  const handleAddSkill = () => {
    if (skillInput.trim() && !skillsList.includes(skillInput.trim())) {
      setSkillsList([...skillsList, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkillsList(skillsList.filter((s) => s !== skill));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3 text-sm text-emerald-600 dark:text-emerald-400 font-bold">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <Card className="p-8 border-slate-200/80 dark:border-slate-800/80 flex items-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-indigo-500/20">
          {user?.username?.charAt(0).toUpperCase()}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{user?.username}</h1>
            <Badge variant="primary">{user?.role}</Badge>
          </div>
          <p className="text-xs text-slate-500">{user?.email}</p>
          {user?.city && (
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 pt-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span>{user.city}</span>
            </p>
          )}
        </div>
      </Card>

      {user?.role === "worker" && (
        <Card className="p-8 border-slate-200/80 dark:border-slate-800/80 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Вироиши профили мутахассис
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t("workers.desired_position")}
              value={desiredPosition}
              onChange={(e) => setDesiredPosition(e.target.value)}
              placeholder="Senior Backend Engineer"
            />
            <Input
              label={t("workers.desired_salary")}
              type="number"
              value={desiredSalary}
              onChange={(e) => setDesiredSalary(e.target.value)}
              placeholder="20000"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Дар бораи худ (Bio)
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {t("workers.skills")}
            </label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Маҳорат илова кунед (масалан: Python)"
              />
              <Button variant="secondary" size="md" onClick={handleAddSkill} leftIcon={<Plus className="w-4 h-4" />}>
                Илова
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {skillsList.map((sk) => (
                <span
                  key={sk}
                  onClick={() => handleRemoveSkill(sk)}
                  className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-semibold cursor-pointer hover:line-through"
                >
                  {sk} ×
                </span>
              ))}
            </div>
          </div>

          <Button
            variant="gradient"
            size="lg"
            onClick={() => updateWorkerMutation.mutate()}
            isLoading={updateWorkerMutation.isPending}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {t("common.save")}
          </Button>
        </Card>
      )}

      {user?.role === "employer" && (
        <Card className="p-8 border-slate-200/80 dark:border-slate-800/80 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Вироиши профили ширкат
          </h2>

          <Input
            label={t("auth.company_name")}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />

          <Input
            label={t("auth.industry")}
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Тавсифи ширкат
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <Button
            variant="gradient"
            size="lg"
            onClick={() => updateCompanyMutation.mutate()}
            isLoading={updateCompanyMutation.isPending}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {t("common.save")}
          </Button>
        </Card>
      )}
    </div>
  );
}
