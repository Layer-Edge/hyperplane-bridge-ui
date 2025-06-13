import { Card } from '../../components/layout/Card';
import { useStore } from '../store';
import { FeelessTokenForm } from './FeelessTokenForm';
import { TransferTokenForm } from './TransferTokenForm';

export function TransferTokenCard() {
  const { selectedBridgeTab } = useStore((s) => ({ selectedBridgeTab: s.selectedBridgeTab }));
  return (
    <Card className="w-full max-w-[500px] sm:w-[31rem]">
      {selectedBridgeTab === 'bridge' ? <TransferTokenForm /> : <FeelessTokenForm />}
    </Card>
  );
}
