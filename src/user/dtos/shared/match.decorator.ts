import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'PasswordsMatch', async: false })
export class PasswordsMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments): boolean {
    const newPassword = (args.object as any).newPassword;
    return confirmPassword === newPassword;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Passwords do not match.';
  }
}
