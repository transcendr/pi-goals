let queueCounter = 0;

export function generateQueueId(): string {
	return `q-${Date.now()}-${++queueCounter}`;
}