import { motion } from "framer-motion";
import { Users, GraduationCap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Fee = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Intermediate Fee",
      description: "Manage fee records for intermediate program students",
      icon: Users,
      path: "/admin/fee/intermediate",
      color: "from-primary/20 to-primary/5",
      iconBg: "bg-primary/10 text-primary",
    },
    {
      title: "BS / ADP Fee",
      description: "Manage fee records for BS and ADP degree program students",
      icon: GraduationCap,
      path: "/admin/fee/bs-adp",
      color: "from-accent/20 to-accent/5",
      iconBg: "bg-accent/10 text-accent-foreground",
    },
  ];

  return (
    <div>
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl">Fee Management</motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-8 text-sm text-muted-foreground">Select a program to manage student fees</motion.p>
      <div className="grid gap-6 sm:grid-cols-2">
        {cards.map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1 }} onClick={() => navigate(card.path)} className={`group cursor-pointer rounded-2xl border border-border bg-gradient-to-br ${card.color} p-6 shadow-card transition-all hover:shadow-lg hover:-translate-y-1`}>
            <div className="mb-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg}`}><card.icon className="h-6 w-6" /></div>
            </div>
            <h2 className="mb-1 font-display text-lg font-bold text-foreground">{card.title}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{card.description}</p>
            <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">Manage Fee <ArrowRight className="h-4 w-4" /></div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Fee;
