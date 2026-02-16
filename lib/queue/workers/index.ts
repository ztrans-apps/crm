/**
 * Queue Workers Index
 * Export all workers
 */

export { whatsappSendWorker } from './whatsapp-send.worker';
export { whatsappReceiveWorker } from './whatsapp-receive.worker';
import webhookDeliveryWorker from './webhook-delivery.worker';
import broadcastSendWorker from './broadcast-send.worker';

export { webhookDeliveryWorker, broadcastSendWorker };

// Start all workers
export function startAllWorkers() {
  console.log('[Queue] Starting all workers...');
  // Workers are automatically started when imported
  console.log('[Queue] All workers started');
}

// Stop all workers
export async function stopAllWorkers() {
  console.log('[Queue] Stopping all workers...');
  const { whatsappSendWorker } = await import('./whatsapp-send.worker');
  const { whatsappReceiveWorker } = await import('./whatsapp-receive.worker');
  const { default: webhookDeliveryWorker } = await import('./webhook-delivery.worker');
  const { default: broadcastSendWorker } = await import('./broadcast-send.worker');
  
  await whatsappSendWorker.close();
  await whatsappReceiveWorker.close();
  await webhookDeliveryWorker.close();
  await broadcastSendWorker.close();
  
  console.log('[Queue] All workers stopped');
}
