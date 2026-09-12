'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import {
  SiDocker,
  SiKubernetes,
  SiHelm,
  SiTerraform,
  SiAnsible,
  SiGithubactions,
  SiGitlab,
  SiJenkins,
  SiGit,
  SiPrometheus,
  SiGrafana,
  SiElasticsearch,
  SiKibana,
  SiLinux,
  SiNginx,
} from 'react-icons/si';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';

// Cloud platforms (AWS / Microsoft Azure / Google Cloud) are deliberately
// not listed here — this row is generic open-source/engineering tooling.
// Cloud platforms and formal cloud partnerships are represented separately
// (see the homepage's dedicated Cloud Partnerships section).
type Tech = { name: string; Icon: IconType };

const technologies: Tech[] = [
  { name: 'Docker', Icon: SiDocker },
  { name: 'Kubernetes', Icon: SiKubernetes },
  { name: 'Helm', Icon: SiHelm },
  { name: 'Terraform', Icon: SiTerraform },
  { name: 'Ansible', Icon: SiAnsible },
  { name: 'GitHub Actions', Icon: SiGithubactions },
  { name: 'GitLab CI/CD', Icon: SiGitlab },
  { name: 'Jenkins', Icon: SiJenkins },
  { name: 'Git', Icon: SiGit },
  { name: 'Prometheus', Icon: SiPrometheus },
  { name: 'Grafana', Icon: SiGrafana },
  { name: 'Elasticsearch', Icon: SiElasticsearch },
  { name: 'Kibana', Icon: SiKibana },
  { name: 'Linux', Icon: SiLinux },
  { name: 'Nginx', Icon: SiNginx },
  { name: 'IAM', Icon: KeyRound },
  { name: 'Secrets Management', Icon: Lock },
  { name: 'Container Security', Icon: ShieldCheck },
];

function TechItem({ name, Icon, hidden }: Tech & { hidden?: boolean }) {
  return (
    <li
      aria-hidden={hidden}
      className="group/item flex shrink-0 items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 transition-colors duration-200 hover:border-brand/40 hover:bg-brand/5"
    >
      <Icon
        className="h-5 w-5 shrink-0 text-gray-600 transition-colors duration-200 group-hover/item:text-brand"
        aria-hidden="true"
      />
      <span className="whitespace-nowrap text-sm font-medium text-gray-700">
        {name}
      </span>
    </li>
  );
}

export function TechMarquee() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (reducedMotion) {
    return (
      <div className="scroll-bar-hidden w-full overflow-x-auto">
        <ul className="flex w-max gap-4 py-2">
          {technologies.map((tech) => (
            <TechItem key={tech.name} {...tech} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
      <ul
        className="flex w-max min-w-full shrink-0 flex-nowrap gap-4 py-2 animate-scroll hover:[animation-play-state:paused]"
        style={{ '--animation-duration': '65s' } as CSSProperties}
      >
        {technologies.map((tech) => (
          <TechItem key={tech.name} {...tech} />
        ))}
        {technologies.map((tech) => (
          <TechItem key={`${tech.name}-dup`} {...tech} hidden />
        ))}
      </ul>
    </div>
  );
}
