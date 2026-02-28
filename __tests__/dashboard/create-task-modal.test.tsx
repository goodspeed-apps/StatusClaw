import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CreateTaskModal } from "@/components/dashboard/create-task-modal"
import type { Task } from "@/lib/mock-data"

describe("CreateTaskModal", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnCreate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render when open", () => {
    render(
      <CreateTaskModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
      />
    )

    expect(screen.getByPlaceholderText("Task title...")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("What needs to be done?")).toBeInTheDocument()
  })

  it("should be hidden when closed", () => {
    const { container } = render(
      <CreateTaskModal
        open={false}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
      />
    )

    // Dialog should not be in the DOM when closed
    expect(container.querySelector("[data-state='open']")).toBeNull()
  })

  it("should update form when user types", async () => {
    const user = userEvent.setup()

    render(
      <CreateTaskModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
      />
    )

    const titleInput = screen.getByPlaceholderText("Task title...")
    await user.type(titleInput, "Test Task")

    expect(titleInput).toHaveValue("Test Task")

    const descInput = screen.getByPlaceholderText("What needs to be done?")
    await user.type(descInput, "Test Description")

    expect(descInput).toHaveValue("Test Description")
  })

  it("should disable create button when title is empty", () => {
    render(
      <CreateTaskModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
      />
    )

    const createButton = screen.getByRole("button", { name: /create task/i })
    expect(createButton).toBeDisabled()
  })

  it("should enable create button when title is entered", async () => {
    const user = userEvent.setup()

    render(
      <CreateTaskModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
      />
    )

    const titleInput = screen.getByPlaceholderText("Task title...")
    await user.type(titleInput, "Test Task")

    const createButton = screen.getByRole("button", { name: /create task/i })
    expect(createButton).toBeEnabled()
  })

  it("should create task with correct data when submitted", async () => {
    const user = userEvent.setup()

    render(
      <CreateTaskModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
      />
    )

    const titleInput = screen.getByPlaceholderText("Task title...")
    await user.type(titleInput, "Test Task")

    const descInput = screen.getByPlaceholderText("What needs to be done?")
    await user.type(descInput, "Test Description")

    const createButton = screen.getByRole("button", { name: /create task/i })
    await user.click(createButton)

    expect(mockOnCreate).toHaveBeenCalledTimes(1)
    expect(mockOnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test Task",
        description: "Test Description",
        status: "backlog",
        priority: "medium",
      })
    )
  })

  it("should call onOpenChange when cancel is clicked", async () => {
    const user = userEvent.setup()

    render(
      <CreateTaskModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
      />
    )

    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it("should display keyboard shortcut hints", () => {
    render(
      <CreateTaskModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
      />
    )

    // Check for keyboard shortcut hints
    expect(screen.getByText("to save")).toBeInTheDocument()
    expect(screen.getByText("to cancel")).toBeInTheDocument()
  })

  it("should allow selecting tags", async () => {
    const user = userEvent.setup()

    render(
      <CreateTaskModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
      />
    )

    const tagButton = screen.getByRole("button", { name: /engineering/i })
    await user.click(tagButton)

    // Fill in title so submit is enabled
    const titleInput = screen.getByPlaceholderText("Task title...")
    await user.type(titleInput, "Test Task")

    const createButton = screen.getByRole("button", { name: /create task/i })
    await user.click(createButton)

    const createdTask = mockOnCreate.mock.calls[0][0] as Task
    expect(createdTask.tags).toContain("engineering")
  })

  it("should allow deselecting tags", async () => {
    const user = userEvent.setup()

    render(
      <CreateTaskModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
      />
    )

    // Select a tag first
    const tagButton = screen.getByRole("button", { name: /engineering/i })
    await user.click(tagButton)

    // Deselect it
    await user.click(tagButton)

    // Fill in title so submit is enabled
    const titleInput = screen.getByPlaceholderText("Task title...")
    await user.type(titleInput, "Test Task")

    const createButton = screen.getByRole("button", { name: /create task/i })
    await user.click(createButton)

    const createdTask = mockOnCreate.mock.calls[0][0] as Task
    expect(createdTask.tags).not.toContain("engineering")
  })

  it("should handle keyboard shortcut Cmd+S to save", async () => {
    const user = userEvent.setup()

    render(
      <CreateTaskModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
      />
    )

    // Fill in title
    const titleInput = screen.getByPlaceholderText("Task title...")
    await user.type(titleInput, "Test Task")

    // Trigger Cmd+S
    fireEvent.keyDown(window, { key: "s", metaKey: true })

    expect(mockOnCreate).toHaveBeenCalledTimes(1)
  })

  it("should handle keyboard shortcut Escape to cancel", async () => {
    render(
      <CreateTaskModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreate={mockOnCreate}
      />
    )

    // Trigger Escape
    fireEvent.keyDown(window, { key: "Escape" })

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })
})
