'use client';

import { PROFILE } from '@/types/types';
import Image from 'next/image';
import { useState } from 'react';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { Button } from '../ui/button';
import { TeamPortrait } from './team-portrait';

const isConfiguredLink = (url?: string) => Boolean(url) && url !== '#';

/**
 * Team cards. Only real data is shown: a social icon appears only when that
 * person has a real profile URL (no greyed-out "coming soon" placeholders),
 * and the "View Certificates" flip side exists only for a member with
 * actual certificate records — never an empty "No certificates found"
 * state, and never a certificate image not verified as that person's.
 */
export const TeamMembers = ({ data }: { data: PROFILE[] }) => {
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 md:px-0 px-4">
      {data.map((member, idx) => {
        const isFlipped = flippedIndex === idx;
        const hasCertificates = Boolean(member.certificates?.length);
        const hasLinkedIn = isConfiguredLink(member.linkedin);
        const hasGitHub = isConfiguredLink(member.github);
        return (
          <div key={idx} className="group perspective">
            {/* Card wrapper */}
            <div
              className={`relative w-full duration-700 preserve-3d ${hasCertificates ? 'h-[300px]' : 'h-[252px]'} ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* FRONT */}
              <div className="absolute inset-0 flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-5 text-center shadow-sm backface-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:border-brand hover:shadow-[0_10px_30px_-12px_rgba(30,58,95,0.25)]">
                {/* Portrait */}
                <div className="mb-3 h-32 w-32 overflow-hidden rounded-full bg-gray-50 ring-1 ring-gray-200 transition-all duration-300 ease-out group-hover:ring-2 group-hover:ring-brand/40">
                  <TeamPortrait name={member.name} image={member.image} />
                </div>

                <h3 className="text-base font-bold text-black transition-colors duration-300 group-hover:text-brand">
                  {member.name}
                </h3>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand">
                  {member.role}
                </p>

                {/* LinkedIn & GitHub — only real, configured profiles */}
                {(hasLinkedIn || hasGitHub) && (
                  <div className="mt-2.5 flex justify-center space-x-3">
                    {hasLinkedIn && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 transition hover:text-brand"
                        aria-label={`${member.name} on LinkedIn`}
                      >
                        <FaLinkedin className="h-4 w-4" />
                      </a>
                    )}
                    {hasGitHub && (
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 transition hover:text-brand"
                        aria-label={`${member.name} on GitHub`}
                      >
                        <FaGithub className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}

                {/* Flip Button — only when there are real certificates */}
                {hasCertificates && (
                  <div className="mt-auto w-full border-t border-gray-100 pt-2.5">
                    <Button
                      onClick={() => setFlippedIndex(idx)}
                      variant="secondary"
                      className="h-7 w-full text-[11px]"
                    >
                      View Certificates
                    </Button>
                  </div>
                )}
              </div>

              {/* BACK */}
              {hasCertificates && (
                <div className="absolute inset-0 flex flex-col rounded-2xl border border-gray-200 bg-white p-4 backface-hidden rotate-y-180">
                  <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {member.certificates?.map((cert, cidx) => (
                        <div
                          key={cidx}
                          className="relative flex h-24 flex-col items-center overflow-hidden rounded-lg p-2"
                        >
                          <Image
                            src={cert.image}
                            alt={cert.title}
                            fill
                            sizes="120px"
                            className="rounded-lg object-contain h-full w-full"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Back Button */}
                  <div className="mt-3 w-full border-t border-gray-100 pt-3">
                    <Button
                      onClick={() => setFlippedIndex(null)}
                      variant="secondary"
                      className="h-7 w-full text-[11px]"
                    >
                      Back to Profile
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
