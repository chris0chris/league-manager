import { ButtonGroup } from "react-bootstrap";

type Props = {
  checked?: boolean;
  className?: string;
  color?: string;
  id: string;
  name: string;
  onChange: (valueId: number) => void;
  required?: boolean;
  text: string;
  value?: number;
};

const RadioButton: React.FC<Props> = ({
  checked = false,
  className = "",
  color = "secondary",
  id,
  name,
  onChange: setValue,
  required = false,
  text,
  value,
}) => {
  return (
    <ButtonGroup className={`col d-grid ${className}`}>
      <input
        type="radio"
        className={`btn-check outline-${color}`}
        name={name}
        id={id}
        autoComplete="off"
        defaultValue={value ? value : text}
        onChange={(ev) => setValue(parseInt(ev.currentTarget.value))}
        checked={checked}
        required={required}
        data-testid={value ? value : text}
      />
      <label
        className={`btn btn-outline-${color}`}
        htmlFor={id}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </ButtonGroup>
  );
};

export default RadioButton;
