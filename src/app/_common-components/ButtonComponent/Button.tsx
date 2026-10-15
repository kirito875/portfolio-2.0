import type { MouseEventHandler } from 'react';
import './Button.css'

type ButtonProps = {
  className: string;
  buttonText: string;
  handleClick?: MouseEventHandler<HTMLButtonElement>;
};

export default function Button({ className, buttonText,handleClick }: ButtonProps) {
  return (<button className={`button ${className}`} onClick={handleClick}>{buttonText}</button>)
}
