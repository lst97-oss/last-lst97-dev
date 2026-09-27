export default {
  ignore: {
    // Doctor matches these paths against whichever scan root is supplied.
    // Support both the usual project root and a focused `src` scan.
    files: [
      'src/server/**',
      'src/components/ui/**',
      'server/**',
      'components/ui/**',
    ],
  },
}
