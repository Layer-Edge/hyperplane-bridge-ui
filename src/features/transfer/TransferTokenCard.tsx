import { Card } from '../../components/layout/Card';
import { TransferTokenForm } from './TransferTokenForm';

export function TransferTokenCard() {
  return (
    <Card className="w-full max-w-[500px] sm:w-[31rem]">
      <TransferTokenForm />
    </Card>
  );
}
