import { useEffect, useMemo, useState } from "react";
import {
  createAttendance,
  createEmployee,
  deleteEmployee,
  getAttendance,
  getEmployees,
  getSummary,
} from "./api";
import PaginationControls from "./components/PaginationControls";
import StatCard from "./components/StatCard";
import StateMessage from "./components/StateMessage";

const PAGE_SIZE_OPTIONS = [5, 10, 15, 25];

const initialEmployee = {
  employee_id: "",
  full_name: "",
  email: "",
  department: "",
};

const initialAttendance = {
  employee_id: "",
  date: new Date().toISOString().slice(0, 10),
  status: "Present",
};

const initialSummary = {
  total_employees: 0,
  total_attendance_records: 0,
  present_today: 0,
  absent_today: 0,
};

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function clampPage(page, totalPages) {
  if (totalPages <= 0) {
    return 1;
  }
  return Math.min(Math.max(page, 1), totalPages);
}

function getPaginationData(items, page, pageSize) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = clampPage(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);

  return {
    rows: items.slice(startIndex, endIndex),
    total,
    totalPages,
    safePage,
    startLabel: total === 0 ? 0 : startIndex + 1,
    endLabel: endIndex,
  };
}

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(initialSummary);

  const [employeeForm, setEmployeeForm] = useState(initialEmployee);
  const [attendanceForm, setAttendanceForm] = useState(initialAttendance);
  const [attendanceFilters, setAttendanceFilters] = useState({ employee_id: "", date: "" });

  const [employeeLoading, setEmployeeLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [employeeError, setEmployeeError] = useState("");
  const [attendanceError, setAttendanceError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [banner, setBanner] = useState(null);

  const [savingEmployee, setSavingEmployee] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [employeePageSize, setEmployeePageSize] = useState(5);

  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePageSize, setAttendancePageSize] = useState(5);

  const apiBase = useMemo(() => import.meta.env.VITE_API_URL || "https://etharaai-9rzk.onrender.com", []);

  const filteredEmployees = useMemo(() => {
    const query = employeeQuery.trim().toLowerCase();
    if (!query) {
      return employees;
    }

    return employees.filter((employee) => {
      const fields = [
        employee.employee_id,
        employee.full_name,
        employee.email,
        employee.department,
      ];
      return fields.some((field) => field.toLowerCase().includes(query));
    });
  }, [employees, employeeQuery]);

  const employeePagination = useMemo(
    () => getPaginationData(filteredEmployees, employeePage, employeePageSize),
    [employeePage, employeePageSize, filteredEmployees]
  );

  const attendancePagination = useMemo(
    () => getPaginationData(attendance, attendancePage, attendancePageSize),
    [attendance, attendancePage, attendancePageSize]
  );

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (employeePagination.safePage !== employeePage) {
      setEmployeePage(employeePagination.safePage);
    }
  }, [employeePage, employeePagination.safePage]);

  useEffect(() => {
    if (attendancePagination.safePage !== attendancePage) {
      setAttendancePage(attendancePagination.safePage);
    }
  }, [attendancePage, attendancePagination.safePage]);

  async function loadEmployees() {
    setEmployeeLoading(true);
    setEmployeeError("");
    try {
      const data = await getEmployees();
      setEmployees(data);
      const selectedStillExists = data.some(
        (employee) => employee.employee_id === attendanceForm.employee_id
      );
      if (data.length === 0) {
        setAttendanceForm((current) => ({ ...current, employee_id: "" }));
      } else if (!selectedStillExists) {
        setAttendanceForm((current) => ({ ...current, employee_id: data[0].employee_id }));
      }
    } catch (error) {
      setEmployeeError(error.message);
    } finally {
      setEmployeeLoading(false);
    }
  }

  async function loadAttendance(filters = attendanceFilters) {
    setAttendanceLoading(true);
    setAttendanceError("");
    try {
      const data = await getAttendance(filters);
      setAttendance(data);
    } catch (error) {
      setAttendanceError(error.message);
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function loadSummary() {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const data = await getSummary();
      setSummary(data);
    } catch (error) {
      setSummaryError(error.message);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadInitialData() {
    await Promise.all([loadEmployees(), loadAttendance(), loadSummary()]);
  }

  function showBanner(kind, message) {
    setBanner({ kind, message });
    window.clearTimeout(window.__hrmsBannerTimer);
    window.__hrmsBannerTimer = window.setTimeout(() => setBanner(null), 3200);
  }

  async function handleEmployeeSubmit(event) {
    event.preventDefault();
    setSavingEmployee(true);
    try {
      await createEmployee(employeeForm);
      setEmployeeForm(initialEmployee);
      setEmployeePage(1);
      showBanner("success", "Employee added successfully.");
      await Promise.all([loadEmployees(), loadSummary()]);
    } catch (error) {
      showBanner("error", error.message);
    } finally {
      setSavingEmployee(false);
    }
  }

  async function handleDelete(employeeId) {
    if (!window.confirm(`Delete employee ${employeeId}?`)) {
      return;
    }

    try {
      await deleteEmployee(employeeId);
      showBanner("success", "Employee deleted successfully.");
      await Promise.all([loadEmployees(), loadAttendance(), loadSummary()]);
    } catch (error) {
      showBanner("error", error.message);
    }
  }

  async function handleAttendanceSubmit(event) {
    event.preventDefault();
    setSavingAttendance(true);
    try {
      await createAttendance(attendanceForm);
      setAttendancePage(1);
      showBanner("success", "Attendance marked successfully.");
      await Promise.all([loadAttendance(), loadEmployees(), loadSummary()]);
    } catch (error) {
      showBanner("error", error.message);
    } finally {
      setSavingAttendance(false);
    }
  }

  async function applyAttendanceFilters(event) {
    event.preventDefault();
    setAttendancePage(1);
    await loadAttendance(attendanceFilters);
  }

  async function clearAttendanceFilters() {
    const cleared = { employee_id: "", date: "" };
    setAttendanceFilters(cleared);
    setAttendancePage(1);
    await loadAttendance(cleared);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Single Admin Workspace</p>
          <h1>HRMS Lite</h1>
          <p className="subtitle">
            Track employee records and daily attendance with a focused, production-ready interface.
          </p>
        </div>
        <p className="api-tag">API: {apiBase}</p>
      </header>

      {banner ? <StateMessage kind={banner.kind} message={banner.message} /> : null}

      <section className="stats-grid">
        {summaryLoading ? (
          <StateMessage kind="info" message="Loading summary..." />
        ) : summaryError ? (
          <StateMessage kind="error" message={summaryError} />
        ) : (
          <>
            <StatCard label="Total Employees" value={summary.total_employees} />
            <StatCard label="Attendance Records" value={summary.total_attendance_records} />
            <StatCard label="Present Today" value={summary.present_today} />
            <StatCard label="Absent Today" value={summary.absent_today} />
          </>
        )}
      </section>

      <main className="layout-grid">
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Employee Management</h2>
              <p className="section-note">Maintain employee profiles and keep records consistent.</p>
            </div>
            <p className="section-pill">{employees.length} total</p>
          </div>

          <form className="form-grid" onSubmit={handleEmployeeSubmit}>
            <label>
              Employee ID
              <input
                required
                value={employeeForm.employee_id}
                onChange={(event) =>
                  setEmployeeForm((current) => ({ ...current, employee_id: event.target.value }))
                }
                placeholder="EMP-001"
              />
            </label>
            <label>
              Full Name
              <input
                required
                value={employeeForm.full_name}
                onChange={(event) =>
                  setEmployeeForm((current) => ({ ...current, full_name: event.target.value }))
                }
                placeholder="Asha Raman"
              />
            </label>
            <label>
              Email Address
              <input
                required
                type="email"
                value={employeeForm.email}
                onChange={(event) =>
                  setEmployeeForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="asha@company.com"
              />
            </label>
            <label>
              Department
              <input
                required
                value={employeeForm.department}
                onChange={(event) =>
                  setEmployeeForm((current) => ({ ...current, department: event.target.value }))
                }
                placeholder="Engineering"
              />
            </label>
            <button disabled={savingEmployee} type="submit">
              {savingEmployee ? "Saving..." : "Add Employee"}
            </button>
          </form>

          <div className="table-toolbar">
            <label className="toolbar-field">
              Search Employees
              <input
                value={employeeQuery}
                onChange={(event) => {
                  setEmployeeQuery(event.target.value);
                  setEmployeePage(1);
                }}
                placeholder="Search by ID, name, email or department"
              />
            </label>
          </div>

          {employeeLoading ? (
            <StateMessage kind="info" message="Loading employees..." />
          ) : employeeError ? (
            <StateMessage kind="error" message={employeeError} />
          ) : employees.length === 0 ? (
            <StateMessage kind="empty" message="No employees found. Add the first employee to begin." />
          ) : employeePagination.total === 0 ? (
            <StateMessage
              kind="empty"
              message="No employees match this search. Try a different keyword."
            />
          ) : (
            <div className="table-wrap fixed-height">
              <table>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Present Days</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employeePagination.rows.map((employee) => (
                    <tr key={employee.employee_id}>
                      <td>{employee.employee_id}</td>
                      <td>{employee.full_name}</td>
                      <td>{employee.email}</td>
                      <td>{employee.department}</td>
                      <td>{employee.total_present_days}</td>
                      <td>
                        <button
                          className="danger-btn danger-inline"
                          onClick={() => handleDelete(employee.employee_id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!employeeLoading && !employeeError ? (
            <PaginationControls
              page={employeePagination.safePage}
              totalPages={employeePagination.totalPages}
              totalCount={employeePagination.total}
              startLabel={employeePagination.startLabel}
              endLabel={employeePagination.endLabel}
              pageSize={employeePageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setEmployeePage}
              onPageSizeChange={(size) => {
                setEmployeePageSize(size);
                setEmployeePage(1);
              }}
              itemLabel="employees"
            />
          ) : null}
        </section>

        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Attendance Management</h2>
              <p className="section-note">Mark daily status and review records quickly.</p>
            </div>
            <p className="section-pill">{attendance.length} records</p>
          </div>

          <form className="form-grid" onSubmit={handleAttendanceSubmit}>
            <label>
              Employee
              <select
                required
                disabled={employees.length === 0}
                value={attendanceForm.employee_id}
                onChange={(event) =>
                  setAttendanceForm((current) => ({ ...current, employee_id: event.target.value }))
                }
              >
                {employees.length === 0 ? <option value="">No employees available</option> : null}
                {employees.map((employee) => (
                  <option key={employee.employee_id} value={employee.employee_id}>
                    {employee.employee_id} - {employee.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <input
                required
                type="date"
                value={attendanceForm.date}
                onChange={(event) =>
                  setAttendanceForm((current) => ({ ...current, date: event.target.value }))
                }
              />
            </label>
            <label>
              Status
              <select
                value={attendanceForm.status}
                onChange={(event) =>
                  setAttendanceForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </label>
            <button disabled={savingAttendance || employees.length === 0} type="submit">
              {savingAttendance ? "Saving..." : "Mark Attendance"}
            </button>
          </form>

          <form className="filter-row" onSubmit={applyAttendanceFilters}>
            <label>
              Filter Employee
              <select
                value={attendanceFilters.employee_id}
                onChange={(event) =>
                  setAttendanceFilters((current) => ({ ...current, employee_id: event.target.value }))
                }
              >
                <option value="">All Employees</option>
                {employees.map((employee) => (
                  <option key={employee.employee_id} value={employee.employee_id}>
                    {employee.employee_id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Filter Date
              <input
                type="date"
                value={attendanceFilters.date}
                onChange={(event) =>
                  setAttendanceFilters((current) => ({ ...current, date: event.target.value }))
                }
              />
            </label>
            <button type="submit">Apply Filters</button>
            <button className="ghost-btn" onClick={clearAttendanceFilters} type="button">
              Reset
            </button>
          </form>

          {attendanceLoading ? (
            <StateMessage kind="info" message="Loading attendance records..." />
          ) : attendanceError ? (
            <StateMessage kind="error" message={attendanceError} />
          ) : attendance.length === 0 ? (
            <StateMessage kind="empty" message="No attendance records found for selected filters." />
          ) : (
            <div className="table-wrap fixed-height">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>Marked At</th>
                  </tr>
                </thead>
                <tbody>
                  {attendancePagination.rows.map((record) => (
                    <tr key={record.id}>
                      <td>{formatDate(record.date)}</td>
                      <td>
                        {record.employee_id} - {record.full_name}
                      </td>
                      <td>
                        <span className={`status-pill status-${record.status.toLowerCase()}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>{formatDateTime(record.marked_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!attendanceLoading && !attendanceError ? (
            <PaginationControls
              page={attendancePagination.safePage}
              totalPages={attendancePagination.totalPages}
              totalCount={attendancePagination.total}
              startLabel={attendancePagination.startLabel}
              endLabel={attendancePagination.endLabel}
              pageSize={attendancePageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setAttendancePage}
              onPageSizeChange={(size) => {
                setAttendancePageSize(size);
                setAttendancePage(1);
              }}
              itemLabel="records"
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}
