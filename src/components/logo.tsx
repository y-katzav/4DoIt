import { ListTodo } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <ListTodo className="h-6 w-6 text-primary" />
      <h1 className="text-xl font-bold text-foreground font-headline">TaskFlow</h1>
    </div>
  );
}
