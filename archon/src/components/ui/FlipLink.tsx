'use client';

import React, { forwardRef } from 'react';

interface FlipLinkProps {
  children: string;
  href?: string;
  onClick?: (e: React.MouseEvent<any>) => void;
  className?: string;
  style?: React.CSSProperties;
  target?: string;
  rel?: string;
}

const FlipLink = forwardRef<any, FlipLinkProps>(
  ({ children, href, onClick, className = '', style, target, rel, ...props }, ref) => {
    const chars = children.split('');

    const content = chars.map((char, i) => (
      <span className="flip-link-char" key={`${char}-${i}`}>
        <span
          className="flip-link-letter"
          style={{ transitionDelay: `${i * 0.012}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
        <span
          className="flip-link-letter-clone"
          style={{ transitionDelay: `${i * 0.012}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      </span>
    ));

    if (href) {
      return (
        <a
          href={href}
          onClick={onClick}
          className={`flip-link group ${className}`}
          style={style}
          target={target}
          rel={rel}
          ref={ref as React.Ref<HTMLAnchorElement>}
          {...props}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        onClick={onClick}
        className={`flip-link group ${className}`}
        style={style}
        type="button"
        ref={ref as React.Ref<HTMLButtonElement>}
        {...props}
      >
        {content}
      </button>
    );
  }
);

FlipLink.displayName = 'FlipLink';

export function FlipText({ children, className = '' }: { children: string; className?: string }) {
  return (
    <span className={`inline-block ${className}`}>
      {children.split('').map((char, i) => (
        <span className="flip-link-char" key={`${char}-${i}`}>
          <span
            className="flip-link-letter"
            style={{ transitionDelay: `${i * 0.012}s` }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
          <span
            className="flip-link-letter-clone"
            style={{ transitionDelay: `${i * 0.012}s` }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        </span>
      ))}
    </span>
  );
}

export default FlipLink;
