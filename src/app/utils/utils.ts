
export default function parseDuration (duration: string) {
    const regex = /PT(\d+)([HMS])/;
    const matches = duration.match(regex);
    if (!matches) return 0;

    const value = parseInt(matches[1], 10);
    const unit = matches[2];

    switch (unit) {
        case 'H':
            return value * 60 * 60 * 1000;
        case 'M':
            return value * 60 * 1000;
        case 'S':
            return value * 1000;
        default:
            return 0;
    }
};