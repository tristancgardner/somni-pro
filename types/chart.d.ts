import { Plugin } from 'chart.js';

declare module 'chart.js' {
  interface PluginOptionsByType<TType> {
    groundTruthPlugin?: {
      showGroundTruth: boolean;
      groundTruthData: any[];
      speakerColors: Record<string, string>;
    };
  }
}
