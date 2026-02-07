import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Plugin Architecture',
    emoji: '🔌',
    description: (
      <>
        17+ built-in plugins for weather, stocks, transit, sports scores, surf conditions, 
        and more. Create your own plugins with our developer guide.
      </>
    ),
  },
  {
    title: 'Docker Ready',
    emoji: '🐳',
    description: (
      <>
        One-command deployment with Docker Compose. Works on Mac, Linux, Windows, 
        and Raspberry Pi. No complex setup required.
      </>
    ),
  },
  {
    title: 'Beautiful Web UI',
    emoji: '✨',
    description: (
      <>
        Modern web interface to manage pages, configure plugins, and monitor your display. 
        PWA support for mobile access.
      </>
    ),
  },
  {
    title: 'Real-Time Updates',
    emoji: '⚡',
    description: (
      <>
        Configurable refresh intervals keep your display current. Smart caching 
        for fast performance and efficient API usage.
      </>
    ),
  },
  {
    title: 'Highly Customizable',
    emoji: '🎨',
    description: (
      <>
        Create custom pages with multiple data sources. Configure silence schedules, 
        time zones, temperature units, and more.
      </>
    ),
  },
  {
    title: 'Open Source',
    emoji: '💚',
    description: (
      <>
        MIT licensed and community-driven. Contribute plugins, report issues, 
        or customize it for your needs. Built with love in San Francisco.
      </>
    ),
  },
];

function Feature({title, emoji, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <span className={styles.featureEmoji}>{emoji}</span>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
