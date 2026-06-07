import { useId } from 'react';
import './ToggleSwitch.css';

interface ToggleSwitchProps {
    /** false = left option active, true = right option active */
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** [left label, right label] */
    labels: [React.ReactNode, React.ReactNode];
    className?: string;
    'aria-label'?: string;
}

const ToggleSwitch = ({
    checked,
    onChange,
    labels,
    className = '',
    'aria-label': ariaLabel,
}: ToggleSwitchProps) => {
    const id = useId();

    return (
        <label
            htmlFor={id}
            className={`switch ${className}`}
            aria-label={ariaLabel}
        >
            <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={e => onChange(e.target.checked)}
            />
            <span>{labels[0]}</span>
            <span>{labels[1]}</span>
        </label>
    );
};

export default ToggleSwitch;
