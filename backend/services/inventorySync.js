let ioInstance;

const attachInventorySync = (io) => {
  ioInstance = io;
  io.on('connection', (socket) => {
    socket.on('request:inventory', async () => {
      socket.emit('inventory:ready');
    });
  });
};

const broadcastInventoryUpdate = (product) => {
  if (!ioInstance) return;
  ioInstance.emit('inventory:update', {
    productId: product.id,
    name: product.name,
    category: product.category,
    stock: product.stock,
    sold: product.sold,
    updatedAt: new Date()
  });
};

module.exports = { attachInventorySync, broadcastInventoryUpdate };
