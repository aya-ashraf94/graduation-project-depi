const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const paginatedResponse = (data, total, page, limit) => ({
  ...(Array.isArray(data) ? { products: data, users: data, orders: data } : data),
  total,
  page,
  pages: Math.ceil(total / limit),
});

module.exports = { getPagination, paginatedResponse };
