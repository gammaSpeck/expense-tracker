import { FolderOpen, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagTab } from "@/components/categories/TagTab";
import { CategoryGrid } from "@/components/categories/CategoryGrid";
import { Category } from "@/types/expense";

interface CategoryTabsProps {
  categories: Category[];
  expenseCounts: Record<string, number>;
  onEdit: (category: Category) => void;
  onDeleteClick: (category: Category) => void;
}

export function CategoryTabs({ categories, expenseCounts, onEdit, onDeleteClick }: CategoryTabsProps) {
  return (
    <div className="animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "backwards" }}>
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <CategoryGrid
            categories={categories}
            expenseCounts={expenseCounts}
            onEdit={onEdit}
            onDeleteClick={onDeleteClick}
          />
        </TabsContent>

        <TabsContent value="tags">
          <TagTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
