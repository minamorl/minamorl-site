"use client";

export default function JobHistory() {
  const jobs = [
    {
      company: "axianext",
      role: "Tech Lead",
      period: "2022 — Present",
      description: [
        "Led development of core platform infrastructure",
        "Designed and implemented microservice architecture",
        "Mentored team of 5 engineers",
      ],
    },
    {
      company: "合同会社Trishula",
      role: "CTO",
      period: "2020 — 2022",
      description: [
        "Full technical ownership of product development",
        "Built CI/CD pipelines and deployment automation",
        "Established coding standards and review processes",
      ],
    },
    {
      company: "株式会社クラスドゥ",
      role: "Full-stack Engineer",
      period: "2018 — 2020",
      description: [
        "Developed web applications with React and Node.js",
        "Implemented real-time features with WebSocket",
        "Database design and optimization",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {jobs.map((job, index) => (
        <div
          key={index}
          className="group relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:border-white/[0.12] transition-all duration-500"
        >
          {/* Accent line */}
          <div className="absolute left-0 top-6 bottom-6 w-px bg-gradient-to-b from-pink-500/50 via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-4">
            <div>
              <h4 className="text-lg font-semibold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-pink-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                {job.company}
              </h4>
              <p className="text-sm text-gray-400 mt-0.5">{job.role}</p>
            </div>
            <span className="text-xs tracking-wider text-gray-500 uppercase font-mono whitespace-nowrap">
              {job.period}
            </span>
          </div>

          <ul className="space-y-2">
            {job.description.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-600 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
