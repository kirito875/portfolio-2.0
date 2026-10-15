import type { Metadata } from "next";
import HomeObject from "./_common-components/HomeObject/HomeObject";
import "./home.css";

export const metadata: Metadata = {
  title: "Sai Kireeti Kasula · Frontend Engineer",
  description:
    "Frontend engineer with 5 years of experience building scalable enterprise React applications.",
};

const SKILLS: { label: string; items: string[] }[] = [
  { label: "Languages", items: ["JavaScript (ES6+)", "TypeScript", "HTML5", "CSS3 / SCSS"] },
  { label: "Frameworks", items: ["React", "Redux / Context", "React Hook Form", "Express"] },
  { label: "Architecture", items: ["Micro Frontends", "Design Systems", "SSO / Entra ID"] },
  { label: "Tooling", items: ["Vite", "Webpack", "Jest", "Vitest", "Git", "Jenkins"] },
  { label: "Cloud", items: ["AWS S3", "CloudFront", "Route 53", "CI/CD"] },
  { label: "AI", items: ["GitHub Copilot", "Microsoft 365 Copilot"] },
];

export default function HomePage() {
  return (
    <section className="home">
      <div className="home__hero">
        <div className="home__intro">
          <p className="eyebrow">Frontend Engineer · React &amp; TypeScript</p>
          <h1 className="home__name">Sai Kireeti Kasula</h1>
          <p className="home__summary">
            I build large-scale, enterprise-grade web applications with React and TypeScript. Over the
            last five years I&apos;ve worked on micro-frontend platforms, design systems and CI/CD
            pipelines — with a growing focus on shipping AI-assisted developer workflows.
          </p>

          <div className="home__meta">
            <span className="pill">Micro Frontends</span>
            <span className="pill">React + TypeScript</span>
            <span className="pill">AWS &amp; CI/CD</span>
          </div>
        </div>

        <div className="home__visual">
          <HomeObject />
        </div>
      </div>

      <article className="card home__skills">
        <h2>Technical skills</h2>
        <div className="skill-grid">
          {SKILLS.map((group) => (
            <div className="skill-group" key={group.label}>
              <h3>{group.label}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
