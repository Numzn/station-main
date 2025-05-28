const ShiftRoster = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Current Week Schedule</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Morning Shift</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Afternoon Shift</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Night Shift</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <tr key={day}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Not assigned</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Not assigned</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Not assigned</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Staff Availability</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Available Staff</h3>
            <p className="mt-2 text-2xl font-semibold text-gray-900">0</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">On Leave</h3>
            <p className="mt-2 text-2xl font-semibold text-gray-900">0</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Total Staff</h3>
            <p className="mt-2 text-2xl font-semibold text-gray-900">0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftRoster; 